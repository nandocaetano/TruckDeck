# Which key does what on each cut, and how the art is changed to match (see remap.py).
#   ops   : (slot, new function, icon source, legend, flags)
#           slot / source: a function name ('horn'), 'fn@1' for the second one, '~3' for the third
#           cloned key, ('T', 'fn') = same panel's tablet cut, ('01T', 'fn') = another panel.
#           icon source None keeps the key's own pictogram; 'text' writes the legend only.
#           flags: 's' = OFF slash over the pictogram, 'small' = small status-bar key.
#   add   : rows of keys cloned from the panel's own picture: [(band y0..y1, insert at y)] in %.
#   'spare' as a function = the next of SPARE_FNS not already on that cut.
PLAN = {}
SPARE = [('mirrors', 'MIRRORS'), ('quick_save', 'SAVE'), ('dash_display', 'DASH'), ('ra_job', 'JOB'),
         ('screenshot', 'SHOT'), ('truck_adjust', 'ADJUST'), ('light_horn', 'FLASH'), ('ra_diag', 'DIAG'), ('cam_interior', 'CAB')]
SPARE_PT = {'mirrors': 'RETROV.', 'quick_save': 'SALVAR', 'dash_display': 'PAINEL', 'ra_job': 'FRETE', 'screenshot': 'FOTO',
            'truck_adjust': 'AJUSTE', 'light_horn': 'LUZ ALTA', 'ra_diag': 'DIAG', 'cam_interior': 'CABINE'}

NOLED = {s[0] for s in SPARE} | {'cam_interior', 'cam_next', 'wipers_back'}

def op(slot, fn, src=None, label=None, flags=''): return (slot, fn, src, label, flags)

# ---- 01 modern American -------------------------------------------------------------------------
PLAN[('modern_us', 'T')] = dict(ops=[
    op('horn', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('wipers', 'wipers', None, 'WIPER ON'),
    op('ra_job', 'horn', 'horn', None, 'small'),
])
PLAN[('modern_us', 'P')] = dict(add=[((47.8, 58.1), 68.2)], ops=[
    op('horn', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('wipers', 'wipers', None, 'WIPER ON'),
    op('air_horn', 'horn', 'horn', 'HORN'),
    op('cruise_down', 'air_horn', 'air_horn', 'AIR HORN'),
    op('cruise_up', 'light_horn', 'high_beam', 'FLASH'),
    op('~1', 'cruise_down', 'cruise_down', 'CRUISE −'),
    op('~2', 'cruise', ('T', 'cruise'), 'CRUISE'),
    op('~3', 'cruise_up', 'cruise_up', 'CRUISE +'),
    op('~4', 'cam_interior', ('T', 'cam_interior'), 'CAMERA'),
])

# ---- 02 modern European -------------------------------------------------------------------------
PLAN[('modern_eu', 'T')] = dict(add=[((77.0, 95.2), 96.0)], ops=[
    op('retarder_up', 'retarder_down', 'retarder_down', 'RET −'),
    op('retarder_down', 'engine_brake_toggle', 'retarder_up', 'ENG BRAKE'),
    op('cruise_down', 'retarder_up', 'retarder_up', 'RET +'),
    op('cruise_up', 'trailer_brake', 'text', 'T. BRAKE'),
    op('wipers_back', 'wipers', None, None),
    op('wipers@0', 'wipers_back', 'wipers_back', None, 's'),
    op('wipers@1', 'spare', 'text'),
    op('~1', 'cruise_down', 'cruise_down', 'CRUISE −'),
    op('~2', 'cruise', 'cruise_down', 'CRUISE'),
    op('~3', 'cruise_up', 'cruise_up', 'CRUISE +'),
] + [op('~%d' % i, 'spare', 'text') for i in range(4, 10)])
PLAN[('modern_eu', 'P')] = dict(add=[((39.8, 50.9), 51.2)], ops=[
    op('retarder_up', 'retarder_down', 'retarder_down', 'RET −'),
    op('retarder_down', 'engine_brake_toggle', 'retarder_up', 'ENG BRAKE'),
    op('cruise_down', 'retarder_up', 'retarder_up', 'RET +'),
    op('cruise_up', 'trailer_brake', 'text', 'T. BRAKE'),
    op('wipers_back', 'wipers', None, None),
    op('wipers@0', 'wipers_back', 'wipers_back', None, 's'),
    op('wipers@1', 'spare', 'text'),
    op('~1', 'cruise_down', 'cruise_down', 'CRUISE −'),
    op('~2', 'cruise', 'cruise_down', 'CRUISE'),
    op('~3', 'cruise_up', 'cruise_up', 'CRUISE +'),
    op('~4', 'spare', 'text'),
])

# ---- 03 modern Brazilian ------------------------------------------------------------------------
PLAN[('modern_br', 'T')] = dict(ops=[
    op('horn', 'wipers_back', 'wipers', 'LIMP. OFF', 's'),
    op('air_horn', 'horn', 'horn', 'BUZINA'),
    op('engine_brake_toggle', 'air_horn', 'air_horn', 'BUZINA A AR'),
    op('cruise_up', 'cruise', 'cruise_down', 'CRUISE'),
    op('trailer_axle', 'cruise_up', 'cruise_up', 'CRUISE +'),
    op('trailer_attach', 'trailer_axle', 'trailer_axle', 'EIXO TRAILER'),
    op('diff_lock', 'engine_brake_down', 'engine_brake_toggle', 'FREIO −'),
    op('cam_next', 'engine_brake_toggle', 'engine_brake_toggle', 'FREIO MOTOR'),
    op('world_map', 'engine_brake_up', 'engine_brake_toggle', 'FREIO +'),
    op('ra_nav', 'trailer_attach', 'trailer_attach', 'TRAILER'),
    op('ra_job', 'diff_lock', 'diff_lock', 'BLOQ. DIF.'),
    op('mirrors', 'cam_next', 'cam_next', 'CÂMERA'),
    op('quick_save', 'world_map', 'world_map', 'MAPA'),
])
PLAN[('modern_br', 'P')] = dict(add=[((51.0, 76.4), 76.8)], ops=[
    op('horn', 'wipers_back', 'wipers', 'LIMP. OFF', 's'),
    op('air_horn', 'horn', 'horn', 'BUZINA'),
    op('engine_brake_toggle', 'air_horn', 'air_horn', 'BUZINA A AR'),
    op('cruise_up', 'cruise', 'cruise_down', 'CRUISE'),
    op('lift_axle', 'cruise_up', 'cruise_up', 'CRUISE +'),
    op('trailer_attach', 'lift_axle', 'lift_axle', '3 EIXO'),
    op('~1', 'engine_brake_down', 'engine_brake_toggle', 'FREIO −'),
    op('~2', 'engine_brake_toggle', 'engine_brake_toggle', 'FREIO MOTOR'),
    op('~3', 'engine_brake_up', 'engine_brake_toggle', 'FREIO +'),
    op('~4', 'trailer_attach', 'trailer_attach', 'TRAILER'),
    op('~5', 'diff_lock', 'diff_lock', 'BLOQ. DIF.'),
    op('~6', 'spare', 'text'), op('~7', 'spare', 'text'), op('~8', 'spare', 'text'),
    op('diff_lock', 'cam_next', ('T', 'cam_next'), 'CÂMERA'),
])

# ---- 04 modern heavy haul -----------------------------------------------------------------------
PLAN[('modern_heavy', 'T')] = dict(ops=[
    op('high_beam', 'lights', ('01T', 'lights'), 'LIGHTS'),
    op('lights', 'high_beam', None, None),
    op('horn', 'wipers_back', 'wipers', None, 's'),
    op('cam_bumper', 'horn', 'horn', None),
    op('cam_interior', 'cruise_down', 'text', 'CRUISE −'),
    op('cam_chase', 'cruise', 'text', 'CRUISE'),
    op('cam_top', 'cruise_up', 'text', 'CRUISE +'),
])
PLAN[('modern_heavy', 'P')] = dict(add=[((57.2, 68.2), 68.6)], ops=[
    op('beacon', 'lights', ('01T', 'lights'), 'LIGHTS'),
    op('high_beam', 'high_beam', 'lights', 'HIGH'),
    op('lights', 'wipers', 'wipers', None),
    op('wipers', 'wipers_back', 'wipers', None, 's'),
    op('horn', 'beacon', 'beacon', 'BEACON'),
    op('air_horn', 'horn', 'horn', None),
    op('~1', 'air_horn', 'air_horn', None),
    op('~2', 'spare', 'text'),
    op('~3', 'cruise_down', ('01T', 'cruise'), 'CRUISE −'),
    op('~4', 'cruise', ('01T', 'cruise'), 'CRUISE'),
    op('~5', 'cruise_up', ('01T', 'cruise'), 'CRUISE +'),
])

# ---- 05 modern rugged ---------------------------------------------------------------------------
PLAN[('modern_rugged', 'T')] = dict(ops=[
    op('beacon', 'wipers', 'wipers', 'WIPER ON'),
    op('wipers', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('engine_brake_toggle', 'engine_brake_down', 'engine_brake_toggle', 'ENG BRK −'),
    op('retarder_up', 'engine_brake_toggle', 'engine_brake_toggle', 'ENG BRAKE'),
    op('cruise', 'engine_brake_up', 'engine_brake_toggle', 'ENG BRK +'),
    op('ra_job', 'beacon', 'beacon', 'BEACON'),
    op('ra_diag', 'cruise_down', 'cruise', 'CRUISE −'),
    op('ra_info', 'cruise', 'cruise', 'CRUISE'),
    op('truck_adjust', 'cruise_up', 'cruise', 'CRUISE +'),
    op('quick_save', 'quick_save', 'text', 'SAVE'),
    op('dash_display', 'dash_display', 'text', 'DASH'),
    op('mirrors', 'mirrors', 'text', 'MIRRORS'),
])
PLAN[('modern_rugged', 'P')] = dict(add=[((56.4, 71.0), 71.4)], ops=[
    op('horn', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('engine_brake_toggle', 'engine_brake_down', 'engine_brake_toggle', 'ENG BRK −'),
    op('retarder_up', 'engine_brake_toggle', 'engine_brake_toggle', 'ENG BRAKE'),
    op('cruise', 'engine_brake_up', 'engine_brake_toggle', 'ENG BRK +'),
    op('air_horn', 'horn', 'horn', 'HORN'),
    op('~1', 'cruise_down', 'cruise', 'CRUISE −'),
    op('~2', 'cruise', 'cruise', 'CRUISE'),
    op('~3', 'cruise_up', 'cruise', 'CRUISE +'),
    op('~4', 'air_horn', 'air_horn', 'AIR HORN'),
])

# ---- 08 classic European, black -----------------------------------------------------------------
PLAN[('old_scania', 'T')] = dict(add=[((71.0, 96.0), 97.0)], ops=[
    op('retarder_up', 'horn', 'horn', 'HORN'),
    op('retarder_down', 'air_horn', 'air_horn', 'AIR'),
    op('horn', 'wipers_back', 'wipers', 'W. OFF', 's'),
    op('air_horn', 'trailer_brake', 'text', 'T. BRAKE'),
    op('~1', 'retarder_down', 'retarder_down', 'RET −'),
    op('~2', 'engine_brake_toggle', 'retarder_up', 'ENG BRK'),
    op('~3', 'retarder_up', 'retarder_up', 'RET +'),
    op('~4', 'cruise_down', ('07T', 'cruise'), 'CRUISE −'),
    op('~5', 'cruise', ('07T', 'cruise'), 'CRUISE'),
    op('~6', 'cruise_up', ('07T', 'cruise'), 'CRUISE +'),
    op('~7', 'spare', 'text'), op('~8', 'spare', 'text'),
])
PLAN[('old_scania', 'P')] = dict(add=[((58.6, 68.6), 68.9), ((58.6, 68.6), 68.9)], ops=[
    op('retarder_up', 'light_horn', 'text', 'FLASH'),
    op('retarder_down', 'trailer_brake', 'text', 'T. BRAKE'),
    op('horn', 'wipers_back', 'wipers', 'W. OFF', 's'),
    op('air_horn', 'horn', 'horn', 'HORN'),
    op('trailer_attach', 'air_horn', 'air_horn', 'AIR'),
    op('~1', 'retarder_down', 'retarder_down', 'RET −'),
    op('~2', 'engine_brake_toggle', 'retarder_up', 'ENG BRK'),
    op('~3', 'retarder_up', 'retarder_up', 'RET +'),
    op('~4', 'trailer_attach', 'trailer_attach', 'TRAILER'),
    op('~5', 'cruise_down', ('07P', 'cruise'), 'CRUISE −'),
    op('~6', 'cruise', ('07P', 'cruise'), 'CRUISE'),
    op('~7', 'cruise_up', ('07P', 'cruise'), 'CRUISE +'),
    op('~8', 'spare', 'text'),
])

# ---- 09 classic Brazilian -----------------------------------------------------------------------
PLAN[('old_brazil', 'T')] = dict(add=[((75.5, 98.0), 99.0)], ops=[
    op('horn', 'wipers_back', 'wipers', 'LIMP. OFF', 's'),
    op('air_horn', 'horn', 'horn', 'BUZINA'),
    op('engine_brake_toggle', 'air_horn', 'air_horn', 'AR'),
    op('trailer_attach', 'trailer_attach', None, 'TRAILER'),
    op('~1', 'engine_brake_down', 'engine_brake_toggle', 'FREIO −'),
    op('~2', 'engine_brake_toggle', 'engine_brake_toggle', 'FREIO MOTOR'),
    op('~3', 'engine_brake_up', 'engine_brake_toggle', 'FREIO +'),
    op('~4', 'cruise_down', ('03T', 'cruise_down'), 'CRUISE −'),
    op('~5', 'cruise', ('03T', 'cruise_down'), 'CRUISE'),
    op('~6', 'cruise_up', ('03T', 'cruise_down'), 'CRUISE +'),
    op('~7', 'cam_next', ('03T', 'cam_next'), 'CÂMERA'),
    op('~8', 'spare', 'text'),
])
PLAN[('old_brazil', 'P')] = dict(span=0.35, add=[((65.3, 77.6), 77.6), ((65.3, 77.6), 77.6)], ops=[
    op('beacon', 'wipers', 'wipers', 'LIMPADOR'),
    op('wipers', 'wipers_back', 'wipers', 'LIMP. OFF', 's'),
    op('horn', 'beacon', 'beacon', 'GIROFLEX'),
    op('engine_brake_toggle', 'trailer_brake', 'trailer_attach', 'FR. TRAILER'),
    op('trailer_attach', 'trailer_attach', None, 'TRAILER'),
    op('~1', 'engine_brake_down', 'engine_brake_toggle', 'FREIO −'),
    op('~2', 'engine_brake_toggle', 'engine_brake_toggle', 'FREIO MOTOR'),
    op('~3', 'engine_brake_up', 'engine_brake_toggle', 'FREIO +'),
    op('~4', 'horn', 'horn', 'BUZINA'),
    op('~5', 'cruise_down', ('03P', 'cruise_down'), 'CRUISE −'),
    op('~6', 'cruise', ('03P', 'cruise_down'), 'CRUISE'),
    op('~7', 'cruise_up', ('03P', 'cruise_down'), 'CRUISE +'),
    op('~8', 'cam_next', ('03T', 'cam_next'), 'CÂMERA'),
])

# ---- 10 classic Nordic, grey --------------------------------------------------------------------
PLAN[('old_volvo', 'T')] = dict(add=[((77.5, 97.0), 98.0)], ops=[
    op('horn', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('retarder_up', 'trailer_brake', 'text', 'T. BRAKE'),
    op('cruise', 'spare', 'text'),
    op('~1', 'retarder_down', ('09T','engine_brake_toggle'), 'RET −'),
    op('~2', 'engine_brake_toggle', ('09T','engine_brake_toggle'), 'ENG BRAKE'),
    op('~3', 'retarder_up', ('09T','engine_brake_toggle'), 'RET +'),
    op('~4', 'cruise_down', 'cruise', 'CRUISE −'),
    op('~5', 'cruise', 'cruise', 'CRUISE'),
    op('~6', 'cruise_up', 'cruise', 'CRUISE +'),
    op('~7', 'horn', 'horn', 'HORN'),
] + [op('~%d' % i, 'spare', 'text') for i in range(8, 12)])
PLAN[('old_volvo', 'P')] = dict(add=[((60.2, 80.2), 80.5)], ops=[
    op('horn', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('retarder_up', 'trailer_brake', 'text', 'T. BRAKE'),
    op('cruise', 'spare', 'text'),
    op('~1', 'retarder_down', ('09T','engine_brake_toggle'), 'RET −'),
    op('~2', 'engine_brake_toggle', ('09T','engine_brake_toggle'), 'ENG BRAKE'),
    op('~3', 'retarder_up', ('09T','engine_brake_toggle'), 'RET +'),
    op('~4', 'horn', 'horn', 'HORN'),
    op('~5', 'cruise_down', 'cruise', 'CRUISE −'),
    op('~6', 'cruise', 'cruise', 'CRUISE'),
    op('~7', 'cruise_up', 'cruise', 'CRUISE +'),
    op('~8', 'spare', 'text'),
])

# ---- 06 classic American, chrome / burl wood ---------------------------------------------------
# The wood panels have no room for more keys, so an extra strip is grown under the key group
# (picture copied from the group, wood grown around it).
PLAN[('old_peterbilt', 'T')] = dict(strip=[((52.0, 75.2), (36.0, 99.6), 75.4, [((52.0, 75.2), [(36.0, 37.4), (67.4, 99.6)], 0.6)])], ops=[
    op('horn', 'wipers_back', 'wipers', 'WIPER OFF', 's'),          # next to WIPER
    op('activate', 'horn', 'horn', 'HORN', 'ENTER_OFF'),
    # new strip, same plate as the key row above: 4 spare functions on the left, then Enter + cruise group + 4 spares
    op('~1', 'spare', 'text'), op('~2', 'spare', 'text'), op('~3', 'spare', 'text'), op('~4', 'spare', 'text'),
    op('~5', 'activate', None, None, 'ENTER_ON'),
    op('~6', 'cruise_down', ('03T', 'cruise_down'), 'CRUISE −'),
    op('~7', 'cruise', ('03T', 'cruise_down'), 'CRUISE'),
    op('~8', 'cruise_up', ('03T', 'cruise_down'), 'CRUISE +'),
    op('~9', 'spare', 'text'), op('~10', 'spare', 'text'), op('~11', 'spare', 'text'), op('~12', 'spare', 'text'),
])
PLAN[('old_peterbilt', 'P')] = dict(span=0.3, moves=[('engine_brake_toggle', 'engine_brake_down'), ('engine_brake_up', 'engine_brake_toggle'), ('lift_axle', 'engine_brake_up'), ('engine_brake_down', 'lift_axle')], add=[((72.0, 82.0), 92.2), ((72.0, 82.0), 92.2)], ops=[
    op('horn', 'wipers_back', 'wipers', 'WIPER OFF', 's'),          # right beside WIPER
    op('~1', 'horn', 'horn', 'HORN'),
    op('~2', 'cruise_down', ('03T', 'cruise_down'), 'CRUISE −'),
    op('~3', 'cruise', ('03T', 'cruise_down'), 'CRUISE'),
    op('~4', 'cruise_up', ('03T', 'cruise_down'), 'CRUISE +'),
    op('lift_axle', 'lift_axle', ('03T', 'lift_axle'), 'AXLE'),
    op('diff_lock', 'diff_lock', ('03T', 'diff_lock'), 'DIFF'),
    op('~5', 'world_map', ('03T', 'world_map'), 'MAP'),
    op('~6', 'cam_next', ('03T', 'cam_next'), 'CAMERA'),
    op('~7', 'activate', None, None, 'ENTER_ON'),
    op('~8', 'menu', ('03T', 'menu'), 'MENU'),
])

# ---- 07 classic American, rosewood --------------------------------------------------------------
PLAN[('old_kenworth', 'T')] = dict(strip=[((78.0, 98.4), (17.0, 93.8), 98.6)], ops=[
    op('cruise', 'spare', 'text'),
    op('~1', 'cruise_down', 'cruise', 'CRUISE −'),
    op('~2', 'cruise', 'cruise', 'CRUISE'),
    op('~3', 'cruise_up', 'cruise', 'CRUISE +'),
    op('beacon', 'wipers', 'wipers', 'WIPER'),                       # WIPER and WIPER OFF side by side
    op('wipers', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('~4', 'beacon', 'beacon', 'BEACON'),
    op('~5', 'hazard', ('01T', 'hazard'), 'HAZARD'),                 # hazard flashers: on every panel
    op('~6', 'spare', 'text'), op('~7', 'spare', 'text'),
])
PLAN[('old_kenworth', 'P')] = dict(span=0.3, add=[((60.6, 70.6), 90.9), ((60.6, 70.6), 90.9)], ops=[
    op('cruise', 'cam_next', ('T', 'cam_next'), 'CAM'),
    op('~1', 'cruise_down', 'cruise', 'CRUISE −'),
    op('~2', 'cruise', 'cruise', 'CRUISE'),
    op('~3', 'cruise_up', 'cruise', 'CRUISE +'),
    op('beacon', 'wipers', 'wipers', 'WIPER'),
    op('wipers', 'wipers_back', 'wipers', 'WIPER OFF', 's'),
    op('~4', 'beacon', 'beacon', 'BEACON'),
    op('~5', 'hazard', ('01T', 'hazard'), 'HAZARD'),
    op('~6', 'spare', 'text'), op('~7', 'spare', 'text'), op('~8', 'spare', 'text'),
])
