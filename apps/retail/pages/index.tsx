import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useLocalStorageAsState } from '../utils/useLocalStorageAsState';
import { QrReader } from '@blackbox-vision/react-qr-reader';

export default function Index() {
  const [basketItems, setBasketItems] = useLocalStorageAsState("basketItems", new Array<BasketItem>());

  const addItemToBasket = (itemId: string) => {
    const clonedBasketItems = getClonedBasketItems();
    const basketItemToModify = getItemFromBasket(itemId);

    if (!basketItemToModify) {
      clonedBasketItems.push(new BasketItem(itemId, 1));
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
          if (basketItem.itemId === itemId) {
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
    return basketItems.find(basketItem => basketItem.itemId == itemId);
  }

  const setItemFromQrCodeText = (itemUrl: string) => {
    const itemId = itemUrl.split("id-")[1];
    addItemToBasket(itemId)
  }

  class BasketItem {
    itemId: string;
    count: number;

    constructor(itemId: string, count: number) {
      this.itemId = itemId;
      this.count = count;
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
      <Typography variant='h4'>Items in Basket</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Count</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!!basketItems && basketItems.map(basketItem =>
              <TableRow
                key={basketItem.itemId}>
                <TableCell>{basketItem.itemId}</TableCell>
                <TableCell>{basketItem.count}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => removeItemFromBasket(basketItem.itemId)}
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

