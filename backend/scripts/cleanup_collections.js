#!/usr/bin/env node
/**
 * Cleanup script to remove old collections from tenant databases
 * This helps with the MongoDB 500 collections per database limit
 * Uses MongoDB native client for direct access
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const Tenant = require('../models/Tenant');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI not set');
  process.exit(1);
}

async function cleanupTenantDb(client, tenantCode, tenantId) {
  try {
    const dbName = `company_${tenantId}`;
    const db = client.db(dbName);
    
    console.log(`\n📁 Cleaning database: ${dbName}`);
    
    const collections = await db.listCollections().toArray();
    console.log(`   Total collections: ${collections.length}`);
    
    if (collections.length > 450) {
      // Keep only important collections
      const keepCollections = new Set([
        'employees',
        'departments',
        'leaverequests',
        'users',
        'attendances',
        'activities',
        'counters'
      ]);
      
      // Collections to remove: anything not in keep list and not system
      const toRemove = collections.filter(col => {
        const name = col.name.toLowerCase();
        return !keepCollections.has(name) && !name.startsWith('system.');
      });
      
      console.log(`   Collections to drop: ${toRemove.length}`);
      
      if (toRemove.length > 0) {
        for (const col of toRemove.slice(0, 100)) { // Drop max 100 at a time
          try {
            await db.dropCollection(col.name);
            console.log(`     ✓ Dropped: ${col.name}`);
          } catch (e) {
            if (!e.message.includes('ns not found')) {
              console.log(`     ✗ ${col.name}: ${e.message}`);
            }
          }
        }
      }
    } else {
      console.log(`   Database is fine (${collections.length} < 450 limit)`);
    }
  } catch (err) {
    console.error(`Error cleaning ${tenantId}:`, err.message);
  }
}

async function cleanup() {
  let client;
  try {
    console.log('🔧 MongoDB Collection Cleanup');
    console.log('============================\n');
    
    // Connect Mongoose for Tenant lookups
    console.log('Connecting to MongoDB (Mongoose)...');
    await mongoose.connect(MONGO_URI);
    
    // Also connect with native driver for admin operations
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connected!\n');
    
    // Fetch all tenants
    const tenants = await Tenant.find({}).lean();
    console.log(`📊 Found ${tenants.length} tenants\n`);
    
    // Clean each tenant database that has too many collections
    let cleaned = 0;
    for (const tenant of tenants) {
      await cleanupTenantDb(client, tenant.code, tenant._id.toString());
      cleaned++;
      if (cleaned % 10 === 0) {
        console.log(`   [Processed ${cleaned}/${tenants.length}]`);
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

cleanup();
