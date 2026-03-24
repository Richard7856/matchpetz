const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yilqentsmibgnzphztxc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbHFlbnRzbWliZ256cGh6dHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTk4OTMsImV4cCI6MjA4ODIzNTg5M30.uCuNnotRMnvm9xM1uCtJERtP2EGCNHrfprjQF6wc_nY'
);

async function audit() {
  console.log('=== SUPABASE DATA AUDIT ===\n');

  // 1. PROFILES
  console.log('--- 1. PROFILES ---');
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, location, created_at');
  if (pErr) console.log('Error:', pErr.message);
  else {
    console.log(`Total profiles: ${profiles.length}`);
    const sampleProfiles = [];
    const realProfiles = [];
    profiles.forEach(p => {
      const isSample = (p.avatar_url && /pravatar|matchpet\.test/i.test(p.avatar_url));
      if (isSample) sampleProfiles.push(p);
      else realProfiles.push(p);
    });
    console.log(`\n  SAMPLE/SEED profiles (${sampleProfiles.length}):`);
    sampleProfiles.forEach(p => console.log(`    - id:${p.id} | "${p.display_name}" | avatar: ${(p.avatar_url||'').substring(0,80)} | ${p.created_at}`));
    console.log(`\n  REAL profiles (${realProfiles.length}):`);
    realProfiles.forEach(p => console.log(`    - id:${p.id} | "${p.display_name}" | loc: ${p.location} | avatar: ${p.avatar_url || 'null'} | ${p.created_at}`));
  }

  // 2. EVENTS
  console.log('\n--- 2. EVENTS ---');
  const { data: events, error: eErr } = await supabase
    .from('events')
    .select('id, title, description, creator_id, event_date, lat, lng, created_at, max_attendees');
  if (eErr) console.log('Error:', eErr.message);
  else {
    console.log(`Total events: ${events.length}`);
    const sample = events.filter(e => !e.creator_id);
    const real = events.filter(e => e.creator_id);
    console.log(`  SAMPLE (null creator_id): ${sample.length}`);
    sample.forEach(e => console.log(`    - "${e.title}" | date: ${e.event_date} | ${e.created_at}`));
    console.log(`  REAL: ${real.length}`);
    real.forEach(e => console.log(`    - "${e.title}" | creator: ${e.creator_id} | date: ${e.event_date}`));
  }

  // 3. CONVERSATIONS
  console.log('\n--- 3. CONVERSATIONS ---');
  const { data: convos, error: cErr } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id, participant_name, is_group, group_name, created_at');
  if (cErr) console.log('Error:', cErr.message);
  else {
    console.log(`Total conversations: ${convos.length}`);
    const orphanedDirect = convos.filter(c => !c.is_group && (!c.user1_id || !c.user2_id));
    const orphanedGroup = convos.filter(c => c.is_group && !c.user1_id);
    const real = convos.filter(c => c.user1_id && (c.user2_id || c.is_group));
    console.log(`  ORPHANED direct (missing user IDs): ${orphanedDirect.length}`);
    orphanedDirect.forEach(c => console.log(`    - "${c.participant_name}" | u1:${c.user1_id||'NULL'} u2:${c.user2_id||'NULL'} | ${c.created_at}`));
    console.log(`  ORPHANED group (null creator): ${orphanedGroup.length}`);
    orphanedGroup.forEach(c => console.log(`    - "${c.group_name||c.participant_name}" | ${c.created_at}`));
    console.log(`  REAL: ${real.length}`);
    real.forEach(c => console.log(`    - "${c.participant_name||c.group_name}" | u1:${c.user1_id} u2:${c.user2_id||'N/A'} | group:${c.is_group} | ${c.created_at}`));
  }

  // 4. ALERTS - use select(*) since column names differ
  console.log('\n--- 4. ALERTS ---');
  const { data: alerts, error: aErr } = await supabase.from('alerts').select('*').limit(50);
  if (aErr) console.log('Error:', aErr.message);
  else {
    console.log(`Total alerts: ${alerts.length}`);
    if (alerts.length > 0) {
      console.log(`  Columns: ${Object.keys(alerts[0]).join(', ')}`);
      alerts.forEach(a => {
        const str = JSON.stringify(a);
        const isSample = !a.user_id || /test|demo|sample|lorem/i.test(str);
        console.log(`    ${isSample ? '[SAMPLE?]' : '[REAL]'} ${str.substring(0, 300)}`);
      });
    } else console.log('  (empty table)');
  }

  // 5. PLACES
  console.log('\n--- 5. PLACES ---');
  const { data: places, error: plErr } = await supabase.from('places').select('*').limit(50);
  if (plErr) console.log('Error:', plErr.message);
  else {
    console.log(`Total places: ${places.length}`);
    if (places.length > 0) {
      console.log(`  Columns: ${Object.keys(places[0]).join(', ')}`);
      places.forEach(p => {
        const str = JSON.stringify(p);
        console.log(`    ${str.substring(0, 300)}`);
      });
    } else console.log('  (empty table)');
  }

  // 6. MARKETPLACE_PRODUCTS
  console.log('\n--- 6. MARKETPLACE_PRODUCTS ---');
  const { data: products, error: mpErr } = await supabase.from('marketplace_products').select('*').limit(50);
  if (mpErr) console.log('Error:', mpErr.message);
  else {
    console.log(`Total products: ${products.length}`);
    if (products.length > 0) {
      console.log(`  Columns: ${Object.keys(products[0]).join(', ')}`);
      products.forEach(p => console.log(`    ${JSON.stringify(p).substring(0, 300)}`));
    } else console.log('  (empty table)');
  }

  // 7. ADOPTION_PETS
  console.log('\n--- 7. ADOPTION_PETS ---');
  const { data: adoptions, error: adErr } = await supabase.from('adoption_pets').select('*').limit(50);
  if (adErr) console.log('Error:', adErr.message);
  else {
    console.log(`Total adoption_pets: ${adoptions.length}`);
    if (adoptions.length > 0) {
      console.log(`  Columns: ${Object.keys(adoptions[0]).join(', ')}`);
      adoptions.forEach(a => console.log(`    ${JSON.stringify(a).substring(0, 300)}`));
    } else console.log('  (empty table)');
  }

  // 8. REVIEWS
  console.log('\n--- 8. REVIEWS ---');
  const { data: reviews, error: rErr } = await supabase.from('reviews').select('*').limit(50);
  if (rErr) console.log('Error:', rErr.message);
  else {
    console.log(`Total reviews: ${reviews.length}`);
    if (reviews.length > 0) {
      console.log(`  Columns: ${Object.keys(reviews[0]).join(', ')}`);
      reviews.forEach(r => console.log(`    ${JSON.stringify(r).substring(0, 300)}`));
    } else console.log('  (empty table)');
  }

  // SUMMARY
  console.log('\n\n========== SUMMARY ==========');
  console.log('See above for detailed findings per table.');

  console.log('\n=== AUDIT COMPLETE ===');
}

audit().catch(console.error);
