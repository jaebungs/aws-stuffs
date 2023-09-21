import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
const REGION = 'us-east-2'
const dynamoDBclient = new DynamoDBClient({ region: REGION })
export { dynamoDBclient };