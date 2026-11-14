// Where the game keeps its online leaderboard.
// The key below is a publishable key: it is meant to be visible in the browser.
// It can only call the two leaderboard functions (game_submit_score, game_leaderboard).
// Remove this file and the game falls back to a leaderboard saved on the device.
window.LINDAS_GAME_CONFIG = {
  supabaseUrl: 'https://ykztdplnpricihsmgakp.supabase.co',
  supabaseKey: 'sb_publishable_a20D06RuQ872sJab2t6KVw_fZK2KEYp'
};
