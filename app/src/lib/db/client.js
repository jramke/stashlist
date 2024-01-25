// import { Client, Account, Databases } from 'node-appwrite';
import { Client, Account, Databases } from 'appwrite';
import { PUBLIC_APPRWITE_PROJECT_ID } from '$env/static/public';

export const client = new Client();

client.setEndpoint('https://cloud.appwrite.io/v1').setProject(PUBLIC_APPRWITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const databaseId = '65b01a67a01a803891d1';
