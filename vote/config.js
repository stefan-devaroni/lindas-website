// Where the T-shirt vote keeps its votes.
// The key below is a publishable key: it is meant to be visible in the browser.
// It can only call the public guest functions (tshirt_vote, tshirt_vote_results).
// Remove this file and the vote falls back to votes saved on the device.
window.LINDAS_CONFIG = {
  supabaseUrl: 'https://ykztdplnpricihsmgakp.supabase.co',
  supabaseKey: 'sb_publishable_a20D06RuQ872sJab2t6KVw_fZK2KEYp'
};
