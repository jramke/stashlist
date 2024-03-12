#!/usr/bin/env node

// const argon2 = require('argon2')
import { Argon2id } from 'oslo/password';
// const Argon2id = require('oslo/password').default;

// Get the password from command line arguments
const string = process.argv[2];

if (!string) {
  console.error('Please provide a string to hash.');
  process.exit(1);
}

// Hash the password using argon2
async function hashString() {
  try {
    const argon2id = new Argon2id();
    const hash = await argon2id.hash(string);
    console.log('Hash:', hash);
  } catch (err) {
    console.error('Error:', err);
  }
}

hashString();
