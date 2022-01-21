import { addMiddlewaresToPipeline, getBasePath } from "@frontend/util-api-client-middlewares";
import { Retail } from "@reshopper-retail/client";

export function retailClient() {
    const hostName = "http://localhost:5000";
    const retailClient = new Retail(
        null!,
        hostName,
        {
            requestContentType: "application/json; charset=utf-8",
            baseUri: hostName,
            allowInsecureConnection: true
        });
    addMiddlewaresToPipeline(retailClient.pipeline);
    return retailClient;
}