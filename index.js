import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { dynamoDBclient } from './ddbClient'
import { DeleteItemCommand, GetItemCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
import {v4 as uuidv4 } from 'uuid'

export const hanlder = async function(event) {
    console.log('handler request: ', JSON.stringify(event,undefined, 2))

    switch(event.httpMethod) {
        case "GET":
            if (event.pathParameters != null) {
                body = await getProduct(event.pathParameters.id)
            } else {
                body = await getAllProduct()
            }
            break;
        case 'POST':
            body = await createProduct(event)
            break;
        case 'DELETE':
            body = await deleteProduct(event.pathParameters.id)
            break;
        default:
            throw new Error('Unspported route: ' + event.httpMethod)

    }

    return {
        statusCode: 200,
        headers: {'Content-Typ': 'text/plain'},
        body: `Hi from aws lamda. You've hit ${event.path}.`
    }
}
// ES6 NodeJS 16.X
// instaed of expeorts.handler = async function(event

const getProduct = async (productId) => {
    console.log('getProduct fired')
    try {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME, // from lamda env variable
            Key: marshall({ id: productId })
        }

        const { item } = await dynamoDBclient.send(new GetItemCommand(params))
        console.log('getProduct', item)
        
        return item ? unmarshall(item) : {};
    } catch (error) {
        console.error(error)
        throw error
    }
}

const getAllProduct = async () => {
    console.log('getAllProduct fired')
    try {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME
        }

        const { items } = await dynamoDBclient.send(new ScanCommand(params))
        console.log('getAllProduct', items)
        
        return items ? items.map(item => unmarshall(item))  : {};
    } catch (error) {
        console.error(error)
        throw error
    }
}

const createProduct = async (event) => {
    try {
        console.log(`createProduct ${event.body}` )
        
        const requestBody = JSON.parse(event.body)
        requestBody.id = uuidv4()

        const param = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: marshall(requestBody || {}) 
        }
        const createResult = await dynamoDBclient.send(new PutItemCommand(param))
        console.log(createResult)
        return createProduct
    } catch (error) {
        console.error(error)
        throw error
    }
}

const deleteProduct = async (productId) => {
    try {
        console.log('deleteProduct', productId)
        const param = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            key : marshall({ id: productId })
        }

        const deleteResult = await dynamoDBclient.send(new DeleteItemCommand(param))
        console.log(deleteResult)
        return deleteProduct
    } catch (error) {
        console.error(error)
        throw error
    }
}