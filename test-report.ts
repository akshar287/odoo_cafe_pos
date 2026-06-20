import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { getReportDataAction } = await import('./actions/reports');
  const data = await getReportDataAction('today');
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
