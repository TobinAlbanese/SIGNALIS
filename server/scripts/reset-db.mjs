import { resetDb, store, tableCounts } from '../db.mjs';
import { seedDemo } from '../seedData.mjs';

resetDb();
seedDemo(store);
console.log('Database reset complete.');
console.log(tableCounts());
