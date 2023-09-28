import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { dynamoDBclient } from './ddbClient.js'
import { DeleteItemCommand, GetItemCommand, PutItemCommand, ScanCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import {v4 as uuidv4 } from 'uuid'

export const hanlder = async function(event) {
    console.log('handler request: ', JSON.stringify(event,undefined, 2))
    let body

    try {
        switch(event.httpMethod) {
            case "GET":
                if (event.queryStringsParameters != null) {
                    body = await getProductByCategory(event)
                }
                else if (event.pathParameters != null) {
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
            case 'PUT':
                body = await updateProduct(event)
                break;
            default:
                throw new Error('Unspported route: ' + event.httpMethod)
    
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully operated: ${event.httpMethod}`,
                body: body
            })
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `Failed operation: ${event.httpMethod}`,
                errorMessage: error.message,
                errorStack: error.stack
            })
        }
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
        return createResult
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
            Key: marshall({ id: productId })
        }

        const deleteResult = await dynamoDBclient.send(new DeleteItemCommand(param))
        console.log(deleteResult)
        return deleteResult
    } catch (error) {
        console.error(error)
        throw error
    }
}

const updateProduct = async (event) => {
    try {
        const requestBody = JSON.parse(event.body)
        const objKeys = Object.keys(requestBody)
        console.log('update Product', requestBody)

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: marshall({ id: event.pathParameters.id }),
            UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
            ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
                ...acc,
                [`#key${index}`]: key,
            }), {}),
            ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
                ...acc,
                [`:value${index}`]: requestBody[key],
            }), {})),
        }

        const updateResult = await dynamoDBclient.send(new UpdateItemCommand(params));
        console.log(updateResult);
        return updateResult;
    } catch (error) {
        console.error(error)
        throw error
    }
}

const getProductByCategory = async (event) => {
    console.log('getProductByCategory', event)

    try {
        const productId = event.pathParameters.id
        const category = event.queryStringParameters.category

        const param = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            KeyConditionExpression: "id = :productId",
            FilterExpression: "contains (category, :category)",
            ExpressionAttributeValues: {
                ":productId": {S: productId},
                ":category": {S: category}
            }
        }

        const { items } = await dynamoDBclient.send(new QueryCommand(param))
        console.log(items)

        return items.map((item) => unmarshall(item))
    } catch (error) {
        console.error(error)
        throw error
    }
}