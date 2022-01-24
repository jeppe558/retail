import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useLocalStorageAsState } from '../utils/useLocalStorageAsState';
import { QrReader } from '@blackbox-vision/react-qr-reader';
import { retailClient } from '../api/Client';

export default function Index() {
  const [basketItems, setBasketItems] = useLocalStorageAsState("basketItems", new Array<BasketItem>());

  const addItemToBasket = async (itemId: string) => {
    const item = await retailClient().retailItemGet(itemId);
    const clonedBasketItems = getClonedBasketItems();
    const basketItemToModify = getItemFromBasket(itemId);

    if (!basketItemToModify) {
      clonedBasketItems.push(new BasketItem(item.id, item.brandOrTitle, item.description, item.priceInHundreds, 1, item.size, item.age));
    } else {
      basketItemToModify.count += 1;
    }

    setBasketItems(clonedBasketItems);
  }

  const removeItemFromBasket = (itemId: string) => {
    const clonedBasketItems = getClonedBasketItems();
    const basketItemToModify = getItemFromBasket(itemId);

    if (!basketItemToModify) {
      return;
    } else {
      if (basketItemToModify.count === 1) {
        // Remove item from basket
        clonedBasketItems.forEach((basketItem, index) => {
          if (basketItem.brandOrTitle === itemId) {
            clonedBasketItems.splice(index, 1);
          }
        });
      } else {
        basketItemToModify.count -= 1;
      }
    }
    setBasketItems(clonedBasketItems);
  }

  const getClonedBasketItems = () => {
    return Object.assign([], basketItems) as BasketItem[];
  }

  const getItemFromBasket = (itemId: string) => {
    return basketItems.find(basketItem => basketItem.brandOrTitle == itemId);
  }

  const setItemFromQrCodeText = (itemUrl: string) => {
    const itemId = itemUrl.split("id-")[1];
    addItemToBasket(itemId)
  }

  class BasketItem {
    itemId: string;
    brandOrTitle: string;
    description: string;
    priceInHundreds: number;
    count: number;
    size?: string;
    age?: string;

    constructor(
      itemId: string,
      brandOrTitle: string,
      description: string,
      priceInHundreds: number,
      count: number,
      size?: string,
      age?: string) {
      this.itemId = itemId;
      this.brandOrTitle = brandOrTitle;
      this.description = description;
      this.priceInHundreds = priceInHundreds;
      this.count = count;
      this.size = size;
      this.age = age;
    }
  }

  return <>

    <Box>
      <QrReader
        onResult={async (result, error) => {
          if (result) {
            setItemFromQrCodeText(result?.getText());
          }

          if (error) {
            console.info(error);
          }
        }} constraints={{ facingMode: "environment" }} />
      <Typography variant='h5'>Items in Basket</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!!basketItems && basketItems.map(basketItem =>
              <TableRow
                key={basketItem.itemId}>
                <TableCell>{`${basketItem.brandOrTitle} ${basketItem.description}`}</TableCell>
                <TableCell>{basketItem.size ? `Str. ${basketItem.size}` : `${basketItem.description} år`}</TableCell>
                <TableCell>{basketItem.priceInHundreds / 100 + " kr."}</TableCell>
                <TableCell>{basketItem.count}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => removeItemFromBasket(basketItem.brandOrTitle)}
                  >
                    Remove one from basket
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  </>
}

