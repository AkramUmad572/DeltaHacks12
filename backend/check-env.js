import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Checking environment variables...\n');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME || 'Not set');

if (process.env.MONGODB_URI) {
  // Hide password in output
  const uri = process.env.MONGODB_URI;
  const masked = uri.replace(/:[^:@]+@/, ':****@');
  console.log('\n📋 Connection string (masked):', masked);
} else {
  console.log('\n❌ MONGODB_URI is not set in .env file!');
  console.log('\n💡 Make sure your backend/.env file contains:');
  console.log('MONGODB_URI=mongodb+srv://omersjd05_db_user:1piQgoJmZrumq7r5@deltahacks12.vox6esd.mongodb.net/kalshi-detector?appName=DeltaHacks12');
}
