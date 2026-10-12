# What each control on each panel physically IS. The ten panels use different hardware
# (rockers, flat tiles, round push buttons, air valves, a toggle lever, a rotary knob), and a
# control is animated according to its kind, so every panel is described on its own.
#   default : kind of an ordinary key on this panel
#   round   : functions drawn as round push buttons
#   valve   : pull/push air valves
#   toggle  : metal lever switches
#   kinds   : anything else that differs from the default, by function
#   capbox  : where the moving cap sits inside the mapped area, when the name is on a separate
#             plate under the key (fractions x0, y0, x1, y1)
#   ign     : how the staged ignition is built (every panel has one; see pressIgn in app.js)
#             btn    = the panel's own START/STOP push button; its glow shows the stage
#             barrel = key barrel in place of a round chrome button
#             lamp   = the panel's own START rocker; its lamp shows the stage (amber, green)
#             knob   = the panel's own rotary start knob, which turns
PANELS = {
    'modern_us': dict(ign='btn', default='rocker', round=['engine'], valve=['parking_brake', 'trailer_brake']),
    'modern_eu': dict(ign='btn', default='tile', round=[], valve=[]),
    'modern_br': dict(ign='btn', default='rocker', round=['engine'], valve=[]),
    'modern_heavy': dict(ign='btn', default='rocker', round=['engine', 'hazard', 'beacon', 'high_beam', 'lights', 'wipers', 'horn', 'air_horn'],
                         valve=['parking_brake', 'trailer_attach'],
                         kinds={'cam_next': 'tile', 'world_map': 'tile', 'menu': 'tile', 'activate': 'tile', 'ra_nav': 'tile', 'screenshot': 'tile'}),
    'modern_rugged': dict(ign='btn', default='rocker', round=['engine', 'parking_brake', 'trailer_attach', 'hazard'], valve=[]),
    'old_peterbilt': dict(default='rocker', round=[], valve=['parking_brake', 'trailer_brake'], ign='barrel',
                          T=dict(round=['engine_brake_down', 'engine_brake_up'], toggle=['engine_brake_toggle'])),
    'old_kenworth': dict(default='tile', capbox=(0, 0, 1, .8), round=[], valve=['parking_brake', 'trailer_brake'], ign='barrel',
                         kinds={'engine_brake_down': 'rocker', 'engine_brake_toggle': 'rocker', 'engine_brake_up': 'rocker'}),
    'old_scania': dict(default='rocker', round=[], valve=[], ign='lamp'),
    'old_brazil': dict(default='tile', capbox=(0, 0, 1, .7), round=['parking_brake'], valve=[], ign='knob'),
    'old_volvo': dict(default='rocker', round=[], valve=[], ign='lamp'),
}
# small transport / preset buttons of the radios, and status-bar icons: flat, they only light
FLAT_FNS = {'media_prev', 'media_play', 'media_next', 'vol_up', 'vol_down', 'vol_mute', 'radio', 'radio_next', 'radio_prev'}
# keys whose press goes "down / less": a rocker tilts the other way for these
DOWN_FNS = {'cruise_down', 'retarder_down', 'engine_brake_down', 'vol_down', 'wipers_back', 'radio_prev', 'media_prev'}

def kind_of(sid, size, fn):
    p = PANELS[sid]; s = p.get(size, {})
    if fn in FLAT_FNS: return 'flat'
    if fn in s.get('toggle', []) or fn in p.get('toggle', []): return 'toggle'
    if fn in s.get('round', []) or fn in p['round']: return 'round'
    if fn in p['valve']: return 'valve'
    return p.get('kinds', {}).get(fn, p['default'])
