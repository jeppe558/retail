import type { OperationOptions } from "@azure/core-client";
import type { HttpHeaders, Pipeline, RestError } from "@azure/core-rest-pipeline";
import { defer } from "lodash";

export function addMiddlewaresToPipeline(pipeline: Pipeline) {
	const tokenContainer = getTokenContainer();

	pipeline.addPolicy({
		name: "allowInsecureConnections",
		sendRequest: async (request, next) => {
			request.allowInsecureConnection = true;

			const response = await next(request);
			return response;
		}
	});
	pipeline.addPolicy({
		name: "version",
		sendRequest: async (request, next) => {
			//we always set the app version to 999.0.0 here, so that server-side version checks will always pass as "latest".
			request.headers.set("X-ReshopperVersion", `999.0.0`);

			const response = await next(request);
			return response;
		}
	});

	let isRenewing = false;
	pipeline.addPolicy({
		name: "jwtRenewal",
		sendRequest: async (request, next) => {
			const expiredToken = tokenContainer.isExpired && tokenContainer.accessToken;
			if (expiredToken && !isRenewing) {
				isRenewing = true;
				try {
					const refreshResponse = await fetch(
						`${getBasePath()}api/account/authentication/refresh?token=${encodeURIComponent(expiredToken)}`,
						{
							method: "POST"
						});
					const refreshJson = await refreshResponse.json();
					tokenContainer.setAccessToken(refreshJson.token);
				} finally {
					isRenewing = false;
				}
			}
 
			return await next(request);
		}
	});

	pipeline.addPolicy({
		name: "redirectToServerSpecifiedLocation",
		sendRequest: async (request, next) => {
			const response = await next(request);

			let redirectUrl = response.headers.get("Location");
			if (redirectUrl && typeof window !== "undefined") {
				const currentBaseUrl = window.location.origin.toLowerCase();
				if (redirectUrl.indexOf(currentBaseUrl) === 0)
					redirectUrl = redirectUrl.substr(currentBaseUrl.length);

				window.location.href = redirectUrl;

				return response;
			}

			return response;
		}
	});

	pipeline.addPolicy({
		name: "redirectToLogin",
		sendRequest: async (request, next) => {
			try {
				return await next(request);
			} catch (e) {
				const response = e as RestError;
				if ('statusCode' in response && response.statusCode === 401) {
					const isAdminPath = window.location.pathname
						.toLowerCase()
						.indexOf("/admin/") === 0;
					tokenContainer.setAccessToken("");

					if (isAdminPath) {
						window.location.href = `/admin/?redirectUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
					}
				}

				throw e;
			}
		}
	});

	pipeline.addPolicy({
		name: "authorization",
		sendRequest: async (request, next) => {
			const token = !tokenContainer.isExpired && tokenContainer.accessToken;
			if (token)
				request.headers.set("Authorization", `Bearer ${token}`);

			const response = await next(request);
			return response;
		}
	});

	pipeline.addPolicy({
		name: "throwErrorOnUnsuccesfulStatusCode",
		sendRequest: async (request, next) => {
			const response = await next(request);

			if (!isSuccessStatusCode(response.status)) {
				throw new ApiCallError(
					response.status,
					response.headers,
					response.bodyAsText
				)
			}

			return response;
		}
	})
}

class EventListener<T = void> {
	private readonly listeners: Array<(data: T) => void>;

	constructor() {
		this.listeners = [];
	}

	public attach(listener: (data: T) => void) {
		if (this.listeners.indexOf(listener) > -1)
			throw new Error("Listener already attached.");

		this.listeners.push(listener);
	}

	public detach(listener: (data: T) => void) {
		const index = this.listeners.indexOf(listener);
		if (index === -1)
			throw new Error("Listener not attached.");

		this.listeners.splice(index, 1);
	}

	public emit(data: T) {
		for (const listener of this.listeners)
			listener(data);
	}
}

export class TokenContainer {
	public readonly onTokenChanged: EventListener;

	constructor() {
		this.onTokenChanged = new EventListener();
	}

	public initialize() {
		if (typeof window === "undefined")
			return;

		const search = new URLSearchParams(window.location.search);
		const tokenFromUrl = search.get("token");
		if (!tokenFromUrl)
			return;

		window.sessionStorage.setItem("token", tokenFromUrl);
		search.delete("token");

		let url = window.location.pathname;
		const searchString = search.toString();
		if (searchString)
			url += "?" + searchString;

		window.history.replaceState(null, "", url);

		console.log('Signed in using access token from URL', tokenFromUrl);
	}

	public setAccessToken(token: string | undefined | null) {
		if (token === "undefined" || token === "null" || !token) {
			token = "";
		}

		localStorage.setItem("token", token);

		this.onTokenChanged.emit();
	}

	public getJwtData(): JwtData | null {
		if (!this.accessToken)
			return null;

		const [, data] = this.accessToken.split('.');
		const json = atob(data);

		return JSON.parse(json);
	}

	private getJwtDataKey(key: keyof JwtData) {
		const data = this.getJwtData();
		if (!data)
			return null;

		return data[key];
	}

	public getUserId() {
		return this.getJwtDataKey("sub") as string;
	}

	public hasJwtRole(role: string) {
		const data = this.getJwtData();
		if (!data)
			return false;

		const rolesAsArray = typeof data.role === "string" ?
			[data.role] :
			data.role;
		if (!rolesAsArray)
			return false;

		return rolesAsArray.indexOf(role) > -1;
	}

	public get expiryDate() {
		const jwtData = this.getJwtData();
		if (!jwtData?.exp)
			return null;

		const expiryDate = new Date(jwtData.exp * 1000);

		return expiryDate;
	}

	public get isExpired() {
		const expiryDate = this.expiryDate;
		if (!expiryDate)
			return false;

		const now = new Date();

		const isTokenExpired = now.getTime() > expiryDate.getTime();
		return isTokenExpired;
	}

	public get accessToken() {
		if (typeof window === "undefined")
			return null;

		return window.sessionStorage.getItem("token") || window.localStorage.getItem("token") || null;
	}
}

export type JwtData = {
	sub: string;
	iss: number;
	exp: number;
	role: string | string[];
}

let container: TokenContainer = null as any;
export const getTokenContainer = () => {
	if (container)
		return container!;

	const newContainer = new TokenContainer();
	newContainer.initialize();

	container = newContainer;
	return newContainer;
}

export function getEnvironmentName() {
	const hostname = typeof window !== "undefined" && window.location.hostname;
	if (!hostname)
		return "Production";

	if (hostname === "localhost" || hostname.startsWith("192.168.")) {
		return "Development";
	}

	if (hostname.startsWith("web-"))
		return "Staging";

	return "Production";
}

export function isDevelopment() {
	return getEnvironmentName() === "Development";
}

export function isProduction() {
	return getEnvironmentName() === "Production"
}

export function isStaging() {
	return getEnvironmentName() === "Staging";
}

export function getDefaultBasePath() {
	const scheme = isDevelopment() ?
		"http:" :
		"https:";
	return `${scheme}//${getDefaultHostname()}/`;
};

export function getDefaultHostname() {
	if (isDevelopment())
		return window.location.hostname + ":5000";

	if (isStaging() && typeof window !== "undefined") {
		const hostname = window.location.hostname;
		return `${hostname.substr("web-".length)}`;
	}

	return "app.reshopper.com";
};

export function getBasePath() {
	if (typeof sessionStorage === "undefined")
		return getDefaultBasePath();

	const storedBasePath = sessionStorage.getItem("api-base-url");
	return storedBasePath || getDefaultBasePath();
}

export async function createHttpClient() {
	const CoreRestPipeline = await import("@azure/core-client");
	const client = new CoreRestPipeline.ServiceClient();
	addMiddlewaresToPipeline(client.pipeline);

	return client;
}

export type ResponseDetails<T = unknown> = {
	data: T,
	statusCode: number | null,
	headers: HttpHeaders | null,
	rawData: string | null | undefined
};

export async function withResponseDetails<T>(
	promise: (options: OperationOptions) => Promise<T>,
	responseInterceptionMode: "reject-on-error" | "resolve-if-successful" = "resolve-if-successful"
): Promise<ResponseDetails<T>> {
	let hasOnResponseFired = false;
	return new Promise((resolve, reject) => {
		promise({
			onResponse: response => {
				hasOnResponseFired = true;

				try {
					if (responseInterceptionMode === "resolve-if-successful") {
						resolve({
							data: response.parsedBody,
							statusCode: response.status,
							headers: response.headers,
							rawData: response.bodyAsText
						});
					}
				}
				catch (e: unknown) {
					if (responseInterceptionMode === "reject-on-error") {
						reject(e);
					}
				}
			}
		}).then(response => {
			defer(() => {
				if (!hasOnResponseFired) {
					console.warn("A request was performed but onResponse was never triggered. Perhaps you forgot to pass options in to the API call of withResponseDetails?");
				}

				resolve({
					data: response,
					statusCode: null,
					headers: null,
					rawData: null
				});
			});
		});
	});
}

function isSuccessStatusCode(statusCode: number) {
	return statusCode < 400;
}

export class ApiCallError extends Error {
	constructor(
		public statusCode: number,
		public headers: HttpHeaders,
		public rawData: string | null | undefined) { 
			super(rawData ?? undefined);
		}
}