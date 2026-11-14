// Where the guest map keeps its pins.
// The key below is a publishable key: it is meant to be visible in the browser.
// It can only call the public guest functions (guest_map_add, guest_map_data).
// Remove this file and the map falls back to pins saved on the device.
window.LINDAS_CONFIG = {
  supabaseUrl: 'https://ykztdplnpricihsmgakp.supabase.co',
  supabaseKey: 'sb_publishable_a20D06RuQ872sJab2t6KVw_fZK2KEYp'
};
