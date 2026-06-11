import { store, getDb } from '../db.mjs';
import { seedDemo } from '../seedData.mjs';

getDb();
const project = seedDemo(store);
console.log(`Seeded demo project: ${project.title} (${project.id})`);
