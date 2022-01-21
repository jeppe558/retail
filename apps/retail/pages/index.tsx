import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { retailClient } from '../api/Client';
import { InferGetServerSidePropsType } from "next"
import { useLocalStorageAsState } from '../utils/useLocalStorageAsState';
import QrReader from 'react-qr-scanner'
import { Component, useState } from 'react';

function Index({ items }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [basketItems, setBasketItems] = useLocalStorageAsState("basketItems", new Array<BasketItem>());
  const [currentScan, setCurrentScan] = useState<string>();

  function addItemToBasket(itemId: string) {
    const clonedBasketItems = getClonedBasketItems();
    const basketItemToModify = getItemFromBasket(itemId);

    if (!basketItemToModify) {
      clonedBasketItems.push(new BasketItem(itemId, 1));
    } else {
      basketItemToModify.count += 1;
    }

    setBasketItems(clonedBasketItems);
  }

  function removeItemFromBasket(itemId: string) {
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

  function getClonedBasketItems() {
    return Object.assign([], basketItems) as BasketItem[];
  }

  function getItemFromBasket(itemId: string) {
    return basketItems.find(basketItem => basketItem.itemId == itemId);
  }

  class BasketItem {
    itemId: string;
    count: number;

    constructor(itemId: string, count: number) {
      this.itemId = itemId;
      this.count = count;
    }
  }

  function handleScan(data: string){
    setCurrentScan(data);
  }
  function handleError(err){
    console.error(err)
  }

  return <>
    <Box>
    {/* <QrReader
          delay={100}
          style={{
            height: 240,
            width: 320,
          }}
          onError={handleError}
          onScan={handleScan}
          /> */}
      <Typography variant='h4'>Available Items</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item =>
              <TableRow
                key={item}>
                <TableCell>{item}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => addItemToBasket(item)}
                  >
                    Add one to basket
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
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

export async function getServerSideProps() {
  const items = ["61dff088024ded729ba2d10c", "61dff089024ded729ba2d113", "61dff089024ded729ba2d11a", "61dff089024ded729ba2d121", "61dff089024ded729ba2d128", "61dff089024ded729ba2d12f"];
  return { props: { items } };
}

export default Index;