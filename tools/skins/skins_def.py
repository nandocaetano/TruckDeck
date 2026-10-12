# Hotspot maps for the ten art panels. Coordinates are percentages of the cropped screen
# (see boxes.py), read off the gridded crops. One list per art per orientation.
TOP = [0.28, 0.04, 0.44, 0.11]   # LED bar near the top edge of a key, relative to the key
BOT = [0.28, 0.83, 0.44, 0.11]   # LED bar near the bottom edge


def hot(fn, x0, y0, x1, y1, led=None, **kw):
    d = dict(t='hot', fn=fn, r=[x0, y0, x1 - x0, y1 - y0])
    if led: d['led'] = led
    d.update(kw)
    return d


def row(fns, y0, y1, first, last, led=None):
    """Evenly spaced keys: `first` and `last` are the (x0, x1) of the end keys."""
    n = len(fns)
    out = []
    for i, fn in enumerate(fns):
        t = i / (n - 1) if n > 1 else 0
        x0 = first[0] + (last[0] - first[0]) * t
        x1 = first[1] + (last[1] - first[1]) * t
        if fn: out.append(hot(fn, x0, y0, x1, y1, led))
    return out


def live(field, x0, y0, x1, y1, **kw):
    d = dict(t='live', field=field, r=[x0, y0, x1 - x0, y1 - y0]); d.update(kw); return d


def gps(x0, y0, x1, y1): return dict(t='gps', r=[x0, y0, x1 - x0, y1 - y0])
def rtext(x0, y0, x1, y1, **kw):
    d = dict(t='rtext', r=[x0, y0, x1 - x0, y1 - y0]); d.update(kw); return d
def cover(x0, y0, x1, y1): return dict(t='cover', r=[x0, y0, x1 - x0, y1 - y0])
def fbar(x0, y0, x1, y1): return dict(t='fbar', r=[x0, y0, x1 - x0, y1 - y0])
def gauge(field, cx, cy, rx, ry=None, **kw):
    """Dial face centred at (cx, cy); rx is the radius as % of width, ry of height."""
    d = dict(t='gauge', field=field, c=[cx, cy, rx, ry]); d.update(kw); return d
def tell(key, x0, y0, x1, y1): return dict(t='tell', tel=key, r=[x0, y0, x1 - x0, y1 - y0])


S = {}

# ---- 01 modern American -------------------------------------------------------------------
S['modern_us'] = dict(
    T=[
        live('speed', 3, 2.5, 13, 15, stack=True), live('gear', 14.3, 2.5, 20.3, 16.5),
        live('fuel', 26.6, 4.3, 31.5, 9.3), cover(23.3, 10, 30, 14.5),
        live('trip2', 40, 4.5, 50.5, 14.5, stack=True),
        hot('ra_job', 52.5, 4, 57, 14), hot('screenshot', 58.5, 4, 63, 14), hot('cam_next', 64, 4, 69, 14),
        rtext(80, 2.8, 97.5, 9.6, two=True),
        hot('media_prev', 80, 10.5, 82.8, 15.5), hot('media_play', 83.2, 10.5, 86, 15.5), hot('media_next', 86.4, 10.5, 89.2, 15.5),
        hot('vol_down', 89.8, 10.5, 92.4, 15.5), hot('vol_up', 93, 10.5, 96.4, 15.5),
        gps(4.6, 24, 41.6, 64.6),
        hot('parking_brake', 46.5, 20.5, 59.8, 44), hot('trailer_brake', 63.8, 20.5, 77, 43.5), hot('engine', 82.5, 20, 97.8, 45),
    ] + row(['hazard', 'lights', 'high_beam', 'beacon', 'wipers', 'horn', 'air_horn'], 50.5, 68.5, (44.8, 50.8), (92.4, 98.6), TOP)
      + row(['engine_brake_down', 'engine_brake_toggle', 'engine_brake_up'], 76.5, 94.5, (2.4, 8.2), (16.8, 22.6), BOT)
      + row(['cruise_down', 'cruise', 'cruise_up'], 76.5, 94.5, (25.3, 30.7), (38.3, 43.7), BOT)
      + row(['trailer_attach', 'lift_axle', 'diff_lock'], 76, 93, (46.6, 53), (63.4, 70))
      + row(['world_map', 'cam_interior', 'menu'], 76.5, 93, (74.3, 81.5), (91, 98.2)),
    P=[
        live('speed', 9, 1, 33, 9.8, stack=True), live('gear', 37, 1.2, 55, 10.2),
        live('fuel', 74, 2.6, 89, 5.8), cover(63, 6.4, 84, 9.4),
        gps(3, 12, 94.5, 32.6),
        rtext(27, 35.4, 96, 40.2, two=True),
        hot('media_prev', 29, 40.6, 37, 45), hot('media_play', 39.5, 40.6, 48, 45), hot('media_next', 50.5, 40.6, 58.5, 45),
        hot('vol_down', 63, 40.6, 73, 45), hot('vol_up', 74, 40.6, 93, 45),
        hot('parking_brake', 0, 46.3, 27.5, 59.2), hot('engine', 33.5, 46.3, 63.5, 59.2), hot('trailer_brake', 69.5, 46.3, 98.5, 59.2),
    ] + row(['hazard', 'lights', 'high_beam', 'beacon'], 60.8, 69.7, (0, 20.5), (75.3, 97.5))
      + row(['wipers', 'horn', 'air_horn', 'cruise', 'cruise_up'], 70.8, 79.7, (0, 18.5), (82.5, 98.5))
      + row(['engine_brake_down', 'engine_brake_toggle', 'engine_brake_up', 'trailer_attach', 'lift_axle', 'diff_lock'], 80.8, 89.4, (0, 13.5), (85.5, 98.5))
      + row(['world_map', 'cam_interior', 'menu'], 90.8, 99.6, (1.5, 30.5), (66.5, 97.5)),
)

# ---- 02 modern European -------------------------------------------------------------------
S['modern_eu'] = dict(
    T=[
        live('speed', 1.8, 9.5, 10.6, 23.5, stack=True), live('gear', 12.6, 9.5, 20.2, 23.5),
        fbar(23.6, 15.2, 32.6, 18.2), live('fuel', 24.5, 19.2, 31.5, 23.4),
        gps(36, 3, 65.2, 26),
        live('eta', 70, 4.8, 77.5, 10.4), live('dist', 70, 12.2, 77.5, 17), live('time', 70, 19.4, 77.5, 24.6),
        rtext(88, 4.6, 98.2, 14.2, two=True),
        hot('media_prev', 79.8, 18.6, 85.2, 26.2), hot('media_play', 86, 18.6, 91.8, 26.2), hot('media_next', 92.4, 18.6, 97.8, 26.2),
        hot('engine', 1.4, 31.5, 11.8, 51.5), hot('parking_brake', 13, 31.5, 23.2, 51.5, TOP),
    ] + row(['retarder_up', 'retarder_down', 'cruise_down', 'cruise_up'], 31.5, 51.5, (24.8, 34.2), (56.4, 65.8), TOP)
      + [hot('hazard', 66.8, 31.5, 78.8, 51.5)]
      + row(['blinker_left', 'blinker_right'], 31.5, 51.5, (79.8, 88.4), (89.4, 98.2), TOP)
      + row(['lights', 'high_beam'], 59.8, 72.6, (1.8, 12.6), (13.8, 24.6))
      + row(['wipers_back', 'wipers', 'custom'], 59.8, 72.6, (28.8, 38.2), (49.8, 58.8))
      + row(['horn', 'air_horn', 'beacon'], 56.2, 73.2, (61.4, 73.2), (87.2, 98.2), TOP)
      + row(['trailer_attach', 'lift_axle', 'trailer_axle', 'diff_lock'], 77.5, 94.5, (1.4, 12.2), (36.6, 46.8), TOP)
      + row(['world_map', 'ra_nav', 'ra_modes', 'cam_next', 'menu'], 77.5, 94.5, (49.4, 58.2), (89.2, 98.2)),
    P=[
        live('speed', 1.5, 4.2, 19, 10.8, stack=True), live('gear', 23, 4.2, 39.5, 10.8),
        fbar(51.4, 5.2, 69.4, 7.4), live('fuel', 50, 8.4, 62, 10.8), live('time', 75.5, 4.2, 97.5, 8.4),
        gps(1, 13, 65.8, 26.2),
        live('dist', 78.5, 13.6, 94, 16.4), live('eta', 78.5, 16.8, 92, 19.6),
        rtext(26, 28.2, 52, 31.8),
        hot('media_prev', 54.8, 28.2, 67, 34.8), hot('media_play', 68.2, 28.2, 80.4, 34.8), hot('media_next', 81.6, 28.2, 93.6, 34.8),
    ] + row(['engine', 'parking_brake', 'hazard'], 37.8, 48.2, (0.8, 29.4), (64.2, 94.6))
      + row(['retarder_up', 'retarder_down', 'cruise_down', 'cruise_up'], 49.8, 59.6, (0.8, 22.2), (73.6, 94.8), TOP)
      + row(['blinker_left', 'blinker_right', 'lights', 'high_beam'], 61.2, 69.2, (0.8, 22.2), (73.6, 94.8))
      + row(['wipers_back', 'wipers', 'custom', 'horn', 'air_horn'], 70.8, 78.6, (0.8, 18.2), (78, 94.8))
      + row(['trailer_attach', 'lift_axle', 'trailer_axle', 'diff_lock', 'beacon'], 80, 89.6, (0.8, 18.6), (78, 94.8), TOP)
      + row(['world_map', 'ra_nav', 'ra_modes', 'cam_next', 'menu'], 91, 99.6, (0.8, 18.2), (78, 94.8)),
)

# ---- 03 modern Brazilian ------------------------------------------------------------------
_br_cols9 = ((2.5, 12), (89, 97.6))
S['modern_br'] = dict(
    T=[
        live('speed', 3.4, 7.2, 12.2, 18.6, stack=True), live('gear', 14.6, 8.2, 21.6, 18.8),
        fbar(26.6, 10.2, 33.4, 12.6), live('fuel', 25.6, 14.2, 31.6, 17.4),
        gps(36.6, 2, 69, 19.8),
        rtext(82.6, 3.4, 97.4, 10.6, two=True),
        hot('media_prev', 83, 12.2, 87, 17.2), hot('media_play', 87.8, 12.2, 91.8, 17.2), hot('media_next', 92.4, 12.2, 96.4, 17.2),
        hot('engine', 2, 26.4, 14.2, 45.6),
    ] + row(['parking_brake', 'hazard', 'blinker_left', 'blinker_right', 'lights', 'high_beam', 'light_horn', 'beacon'], 25.4, 46.2, (16, 25.6), (89, 97.6), TOP)
      + row(['wipers', 'horn', 'air_horn', 'engine_brake_toggle', 'cruise_down', 'cruise_up', 'trailer_axle', 'lift_axle', 'trailer_attach'], 51.4, 71.6, (2.5, 12.2), (89, 97.6), TOP)
      + row(['diff_lock', 'cam_next', 'world_map', 'custom', 'custom', 'custom', 'custom', 'custom', 'menu'], 77, 97.2, (2.5, 12.2), (89, 97.6), TOP),
    P=[
        live('speed', 7, 2.4, 23, 8.2, stack=True), live('gear', 32, 2.4, 48, 8.2),
        fbar(68, 3.4, 97, 5.1), live('fuel', 66, 5.8, 80, 7.9),
        gps(2, 10.5, 98, 22.8),
        rtext(29, 26, 63, 31.6, two=True),
        hot('media_prev', 68, 26.8, 76.5, 30.8), hot('media_play', 78.5, 26.8, 87, 30.8), hot('media_next', 89, 26.8, 97, 30.8),
    ] + row(['engine', 'parking_brake', 'hazard', 'beacon'], 35.4, 46.2, (1, 26), (77.5, 99.2))
      + row(['blinker_left', 'blinker_right', 'lights', 'high_beam'], 48, 59.2, (1, 26), (77.5, 99.2), TOP)
      + row(['wipers', 'horn', 'air_horn', 'engine_brake_toggle'], 61, 72.2, (1, 26), (77.5, 99.2), TOP)
      + row(['cruise_down', 'cruise_up', 'lift_axle', 'trailer_attach'], 74, 85.2, (1, 26), (77.5, 99.2), TOP)
      + row(['diff_lock', 'cam_next', 'world_map', 'menu'], 87.4, 98.6, (1, 26), (77.5, 99.2), TOP),
)

# ---- 04 modern heavy haul -----------------------------------------------------------------
S['modern_heavy'] = dict(
    T=[
        live('speed', 6.4, 3.4, 12.6, 9.8, stack=True), live('gear', 26.4, 2.6, 32, 6.4),
        live('fuel', 45.8, 2.8, 50.8, 6.2), live('dist', 58.4, 3.2, 64.4, 6.2), live('left', 69.4, 3.2, 76, 6.2), live('time', 81.2, 2.6, 88.8, 6),
        gps(32, 12.6, 69.6, 36.2),
        hot('cam_next', 91.4, 12, 98.2, 18.8), hot('world_map', 91.4, 20.4, 98.2, 28.2), hot('menu', 91.4, 30, 98.2, 37.2),
    ] + row(['engine', 'hazard', 'beacon', 'custom', 'lights', 'wipers', 'horn', 'air_horn'], 40.4, 55.6, (2.4, 12.6), (86.4, 96.4))
      + row(['engine_brake_down', 'engine_brake_toggle', 'engine_brake_up'], 58, 73.2, (3, 10.6), (24.2, 31.8), TOP)
      + row(['trailer_brake', 'lift_axle', 'trailer_axle', 'diff_lock', 'custom'], 58, 74, (40, 47.6), (88.2, 95.8), TOP)
      + [hot('parking_brake', 1.8, 77.6, 18.4, 97.4), hot('trailer_attach', 19.8, 77.6, 36.8, 97.4)]
      + row(['custom', 'custom', 'custom', 'custom'], 77.6, 95.4, (42.6, 50.2), (75, 82.8), BOT)
      + [hot('screenshot', 88.2, 77.6, 95.8, 85.4), hot('ra_nav', 88.2, 86.8, 95.8, 96.4)],
    P=[
        live('speed', 9, 1.8, 23, 7.6, stack=True), live('gear', 29.5, 1.8, 43, 5.2), live('fuel', 57.5, 2.2, 70, 5.2), live('time', 77, 2.6, 89, 5.4),
        gps(5.4, 10, 75.6, 28.6),
        hot('world_map', 81, 9.4, 96.2, 16.2), hot('cam_next', 81, 17.4, 96.2, 23.2), hot('menu', 81, 24, 96.2, 29.8),
        hot('engine', 56, 31.4, 75.4, 43.2), hot('hazard', 77.4, 31.4, 97.2, 43.2),
    ] + row(['beacon', 'custom', 'lights', 'wipers'], 45.4, 56.8, (3, 24.4), (76, 97.2))
      + row(['horn', 'air_horn'], 57.8, 67.8, (2.4, 22.4), (24, 44.2))
      + row(['engine_brake_down', 'engine_brake_toggle', 'engine_brake_up'], 58.4, 67.6, (46.8, 61.2), (81.8, 96.2))
      + row(['trailer_brake', 'lift_axle', 'trailer_axle', 'diff_lock', 'custom'], 69.8, 81.8, (4, 19.4), (78.8, 94.2), TOP)
      + [hot('parking_brake', 4, 84.6, 36.4, 99.2), hot('trailer_attach', 39.6, 84.6, 70.4, 99.2),
         hot('screenshot', 77.4, 84, 95.4, 90.4), hot('ra_nav', 77.4, 91.4, 95.4, 98.4)],
)

# ---- 05 modern rugged ---------------------------------------------------------------------
_LED_MID = [0.3, 0.6, 0.4, 0.08]   # LED between pictogram and legend
S['modern_rugged'] = dict(
    T=[
        live('speed', 6.4, 7.8, 12.2, 18.8, stack=True), live('gear', 18.4, 11.4, 22.8, 18.8),
        live('fuel', 32.4, 5.6, 37.4, 10.4), fbar(29.4, 12.4, 37.2, 15.6),
        gps(40, 1.6, 70.6, 20),
        rtext(81.4, 2.8, 98.2, 7.2),
        hot('media_prev', 81.8, 8.2, 86.8, 14.4), hot('media_play', 87.2, 8.2, 92.2, 14.4), hot('media_next', 92.8, 8.2, 97.8, 14.4),
        hot('vol_down', 81.8, 15.2, 85, 19.4), hot('vol_up', 85.4, 15.2, 97.4, 19.4),
    ] + row(['engine', 'parking_brake', 'trailer_attach', 'hazard'], 24.4, 47.2, (1.8, 12.2), (40.4, 52.4))
      + row(['lights', 'beacon', 'wipers', 'horn', 'air_horn'], 24.8, 46.8, (55.8, 62.8), (90.2, 97.2), _LED_MID)
      + row(['engine_brake_toggle', 'retarder_up', 'cruise'], 51.4, 73.2, (2.8, 12.2), (24.8, 33.8), TOP)
      + row(['lift_axle', 'trailer_axle', 'diff_lock'], 51.4, 73.2, (38.4, 47.2), (60, 68.8), TOP)
      + [hot('custom', 73.8, 52.4, 82.4, 73.2), hot('custom', 85.8, 51.4, 94.8, 73.2, TOP)]
      + row(['world_map', 'cam_next', 'menu'], 78.6, 97.4, (3.2, 13.2), (27.4, 36.8))
      + row(['custom', 'custom', 'custom', 'custom', 'custom', 'custom'], 78.6, 97.4, (40.2, 47.8), (89.8, 97.2), TOP),
    P=[
        live('speed', 12, 3.8, 27, 10.6, stack=True), live('gear', 43, 6.4, 53, 10.8),
        live('fuel', 78, 2.6, 94, 5.2), fbar(70, 6.8, 92.5, 9.2),
        gps(2, 12.4, 49.4, 26.6),
        rtext(70.5, 13.6, 97, 16),
        hot('media_prev', 70, 17.2, 79, 21), hot('media_play', 80, 17.2, 88.5, 21), hot('media_next', 89.5, 17.2, 97.5, 21),
        hot('vol_down', 55, 22.4, 64.5, 25.6), hot('vol_up', 65.5, 22.4, 96, 25.6),
    ] + row(['engine', 'parking_brake', 'trailer_attach', 'hazard'], 28.4, 40.2, (2.8, 26.4), (76.6, 98.6))
      + row(['lights', 'beacon', 'wipers', 'horn'], 41.8, 55.8, (3.4, 26.4), (76.6, 98.6), _LED_MID)
      + row(['engine_brake_toggle', 'retarder_up', 'cruise', 'air_horn'], 57.6, 70.4, (3.4, 26.4), (76.6, 98.6), TOP)
      + row(['lift_axle', 'trailer_axle', 'diff_lock', 'custom'], 72, 84.8, (3.4, 26.4), (76.6, 98.6), TOP)
      + row(['custom', 'world_map', 'cam_next', 'menu'], 86.4, 99.4, (3.4, 26.4), (76.6, 98.6)),
)

# ---- 06 classic American, chrome ----------------------------------------------------------
S['old_peterbilt'] = dict(
    T=[
        gauge('speed', 14.3, 21.5, 11.3), gauge('rpm', 39.3, 21.5, 10.6), gauge('fuel', 59.6, 21, 7.6), gauge('air', 77.3, 21.5, 8),
        tell('blinkL', 4.4, 41.8, 8.2, 47.4), tell('high', 12.8, 41.8, 16.8, 47.4), tell('lightsOn', 20.8, 41.8, 24.8, 47.4),
        tell('beacon', 28.6, 41.8, 32.4, 47.4), tell('park', 36.2, 41.8, 40.2, 47.4), tell('never', 43.8, 41.8, 47.8, 47.4),
        tell('lift', 51.8, 41.8, 57.2, 47.4), tell('cruiseOn', 61.6, 41.8, 65.4, 47.4),
        live('gear', 73.4, 41.8, 79.8, 48), live('time', 85.6, 42.2, 94.4, 47.8),
        hot('engine', 1.4, 53.8, 10.2, 68.6), hot('parking_brake', 10.6, 52.8, 21.2, 70.8), hot('trailer_brake', 22.4, 52.8, 33.8, 71.2),
    ] + row(['hazard', 'lights', 'high_beam', 'beacon', 'wipers', 'horn', 'light_horn', 'air_horn'], 54.4, 71.6, (36, 43.6), (91.2, 98.4), TOP)
      + row(['engine_brake_down', 'engine_brake_toggle', 'engine_brake_up'], 75.6, 94.4, (2.4, 8.8), (19.4, 25.8))
      + [rtext(39.4, 79.2, 50.8, 84.8), hot('media_play', 29.4, 79, 35, 88.6)]
      + row(['media_prev', 'vol_down', 'vol_up', 'media_next'], 89.2, 93.8, (29.6, 35.6), (52, 58))
      + row(['lift_axle', 'diff_lock', 'world_map', 'cam_next', 'menu'], 76.6, 94.4, (62.4, 69.2), (92.2, 98.8), TOP),
    P=[
        gauge('speed', 26.5, 11.3, 22), gauge('rpm', 75.5, 11.3, 22), gauge('fuel', 19, 28.5, 14.5), gauge('air', 56.5, 28, 14.5),
        tell('blinkL', 5.4, 37.4, 11.8, 40.6), tell('high', 17.8, 37.4, 25.8, 40.6), tell('lightsOn', 29.4, 37.4, 37.2, 40.6),
        tell('beacon', 40.8, 37.4, 48.8, 40.6), tell('park', 51.8, 37.4, 59.4, 40.6), tell('never', 63.2, 37.4, 71.2, 40.6),
        tell('lift', 75.2, 37.4, 84.4, 40.6), tell('cruiseOn', 88.2, 37.4, 96.4, 40.6),
        live('gear', 30.5, 43.4, 41.5, 47.6), live('time', 55.5, 43.4, 77.5, 47.6),
        hot('engine', 10, 50, 28.5, 59.6), hot('parking_brake', 38, 49.4, 62.5, 60.2), hot('trailer_brake', 69.5, 48.8, 98.5, 60.2),
    ] + row(['hazard', 'lights', 'high_beam', 'beacon'], 62.4, 71.6, (5.8, 28), (78.2, 99.2), TOP)
      + row(['wipers', 'horn', 'air_horn', 'engine_brake_down'], 72.4, 81.6, (5.8, 28), (78.2, 99.2))
      + row(['engine_brake_toggle', 'engine_brake_up', 'lift_axle', 'diff_lock'], 82.4, 91.6, (5.8, 28), (78.2, 99.2))
      + [rtext(17.5, 94.4, 41, 97.4), hot('media_play', 2, 92.6, 16, 100), hot('media_next', 42, 92.6, 53.5, 100),
         hot('world_map', 55.5, 92.8, 72, 100), hot('cam_next', 75.5, 92.8, 90.5, 100), hot('menu', 92.5, 92.8, 100, 100)],
)

# ---- 07 classic American, rosewood --------------------------------------------------------
S['old_kenworth'] = dict(
    T=[
        gauge('speed', 13.7, 20.5, 10.8), gauge('rpm', 36.3, 20.5, 10.6), gauge('fuel', 69.7, 21.5, 8.6), gauge('air', 88.7, 21.5, 8.8),
        live('gear', 51.6, 7, 56.8, 15), live('time', 50.6, 16.2, 57.6, 21.4),
        tell('blinkL', 3.8, 43.2, 7.2, 48), tell('lightsOn', 8.8, 43.2, 12.2, 48), tell('high', 13.4, 43.2, 17, 48),
        tell('beacon', 18.4, 43.2, 21.8, 48), tell('park', 22.8, 43.2, 26.4, 48), tell('never', 27.4, 43.2, 31.2, 48),
        tell('lift', 32.2, 43.2, 36.8, 48), tell('never', 37.4, 43.2, 41.4, 48), tell('cruiseOn', 44, 43.2, 47.4, 48),
        rtext(72.6, 42.4, 83.4, 47.4), hot('media_play', 63.2, 41.8, 68.8, 51.2),
        hot('media_prev', 71, 49.2, 76, 52.4), hot('media_next', 87, 49.2, 92, 52.4),
        hot('engine', 3.2, 56.8, 12.2, 71.4), hot('parking_brake', 13.4, 56.6, 21.8, 70.4), hot('trailer_brake', 24.4, 55.8, 33.8, 70.8),
    ] + row(['lights', 'high_beam', 'beacon', 'wipers', 'horn', 'air_horn'], 57.4, 73.2, (36.4, 44.2), (88, 96.4))
      + row(['engine_brake_down', 'engine_brake_toggle', 'engine_brake_up'], 79.4, 95.2, (4.4, 7.9), (11.8, 15.3))
      + row(['cruise', 'lift_axle', 'trailer_axle', 'diff_lock', 'world_map', 'cam_next', 'menu'], 79.4, 95.2, (18.8, 27.6), (88.4, 96.6)),
    P=[
        gauge('speed', 24, 12.5, 22.5), gauge('rpm', 74.5, 12.5, 23), gauge('fuel', 17, 31.5, 16), gauge('air', 78.5, 31.5, 16),
        live('gear', 41.5, 26.2, 54.5, 31.2), live('time', 40.5, 31.8, 55.5, 34.8),
        tell('blinkL', 5.2, 42.2, 13.4, 46.8), tell('lightsOn', 17.6, 42.2, 26.4, 46.8), tell('high', 29.6, 42.2, 38.4, 46.8),
        tell('beacon', 41.2, 42.2, 50.4, 46.8), tell('park', 53.8, 42.2, 63.2, 46.8), tell('never', 66.2, 42.2, 75.4, 46.8),
        tell('lift', 81.6, 42.2, 92.4, 46.8),
        rtext(29.5, 49.8, 54.5, 53.8), hot('media_play', 6.5, 49.6, 18.5, 56.4),
        hot('media_prev', 23, 54.6, 34, 57.4), hot('media_next', 69, 54.6, 81, 57.4),
        hot('engine', 7.5, 58.8, 28.5, 68.8), hot('parking_brake', 37.5, 58.2, 58.5, 69.2), hot('trailer_brake', 68.5, 58.2, 90.5, 69.2),
    ] + row(['lights', 'high_beam', 'beacon', 'wipers'], 70.4, 79.2, (3, 24.4), (75.4, 96.4))
      + row(['horn', 'air_horn'], 80.4, 89.2, (3, 24.4), (27.2, 48.6))
      + row(['engine_brake_down', 'engine_brake_toggle', 'engine_brake_up'], 80.4, 89.2, (52.6, 58.6), (64.8, 70.8))
      + [hot('cruise', 75.4, 80.4, 96.4, 89.2)]
      + row(['lift_axle', 'trailer_axle', 'diff_lock', 'world_map', 'cam_next', 'menu'], 90.4, 99.6, (1, 15.6), (83.4, 97.4)),
)

# ---- 08 classic European, black -----------------------------------------------------------
_L8 = [0.3, 0.08, 0.4, 0.11]
S['old_scania'] = dict(
    T=[
        gauge('speed', 12.8, 24.5, 10, max=120, a0=-125, a1=123), gauge('rpm', 35, 25, 9.8, max=3000, a0=-122, a1=122),
        gauge('fuel', 52.2, 16.8, 5.3, a0=-70, a1=70), gauge('air', 65, 16.8, 5.3, max=12, unit='bar', a0=-70, a1=70),
        live('gear', 47, 29.5, 57.5, 38.5), live('time', 59.5, 30, 70, 38),
        rtext(79.6, 20.5, 95.4, 26.6),
        hot('media_play', 73.8, 28.5, 79.2, 37.5),
        hot('media_prev', 79.8, 28.3, 83.3, 32), hot('vol_down', 83.6, 28.3, 87, 32), hot('vol_up', 87.4, 28.3, 91, 32), hot('media_next', 92.2, 28.3, 96, 32),
    ] + row(['custom'] * 5, 33, 37.4, (80, 83.2), (93, 96.2))
      + row(['engine', 'parking_brake', 'retarder_up', 'retarder_down', 'hazard'], 44, 67, (2.3, 10), (38.3, 46), _L8)
      + row(['lights', 'high_beam', 'beacon', 'wipers', 'horn'], 44, 67, (48.3, 56.3), (89.3, 97.3), _L8)
      + row(['air_horn', 'trailer_attach', 'lift_axle', 'diff_lock'], 71.5, 95, (2.5, 10.3), (32.3, 40.1), _L8)
      + row(['ra_nav', 'world_map', 'cam_next', 'menu'], 71.5, 95, (42.5, 50.5), (74.5, 82.5), _L8),
    P=[
        gauge('speed', 27, 13.5, 22, max=120, a0=-125, a1=123), gauge('rpm', 77.5, 14.5, 22, max=3000, a0=-122, a1=122),
        gauge('fuel', 18.5, 30, 13.5, a0=-70, a1=70), gauge('air', 56.5, 29.5, 13.5, max=12, unit='bar', a0=-70, a1=70),
        live('gear', 80, 24.5, 97, 29.5), live('time', 80, 30.5, 98, 33.6),
        rtext(41, 38.5, 93, 42.5),
        hot('media_play', 5, 38.5, 23, 46.5),
    ] + row(['media_prev', 'vol_down', 'media_play', 'vol_up', 'media_next'], 43.4, 45.4, (26, 39), (84, 98))
      + row(['custom'] * 5, 45.9, 48.2, (26, 39), (84, 98))
      + row(['engine', 'parking_brake', 'retarder_up', 'retarder_down'], 50.5, 59.7, (4.5, 24.5), (79.5, 99), _L8)
      + row(['hazard', 'lights', 'high_beam', 'beacon'], 60.5, 69.7, (4.5, 24.5), (79.5, 99), _L8)
      + row(['wipers', 'horn', 'air_horn', 'trailer_attach'], 70.5, 79.7, (4.5, 24.5), (79.5, 99), _L8)
      + row(['lift_axle', 'diff_lock', 'ra_nav', 'world_map'], 80.3, 89.7, (4.5, 24.5), (79.5, 99), _L8)
      + row(['cam_next', 'menu'], 90.5, 99.6, (4.5, 24.5), (29.5, 49.5), _L8),
)

# ---- 09 classic Brazilian -----------------------------------------------------------------
_br9 = ((2, 24.5), (76.5, 99))
S['old_brazil'] = dict(
    T=[
        gauge('speed', 10, 18.5, 9.3, max=120, a0=-120, a1=122), gauge('rpm', 29.5, 18.5, 9.5, max=3000, a0=-122, a1=122),
        gauge('fuel', 71.5, 17.5, 8.8, a0=-61, a1=60), gauge('air', 89.5, 17.5, 8.8, max=15, unit='bar', a0=-62, a1=62),
        live('gear', 43.3, 5.5, 49.2, 15), live('time', 50.8, 5.5, 59.4, 11), live('dist', 53.4, 11.8, 59.6, 15.2),
        tell('blinkL', 41.2, 23.4, 45, 28.6), tell('high', 45.4, 23.4, 49, 28.6), tell('park', 49.4, 23.4, 53, 28.6),
        tell('batt', 53.4, 23.4, 57, 28.6), tell('check', 57.4, 23.4, 61, 28.6),
        rtext(39.2, 40.8, 65, 47.6),
        hot('media_play', 22.2, 40.5, 29.6, 52.5),
        hot('vol_up', 74.2, 39, 77, 45.2), hot('vol_down', 74.2, 47, 77, 53.4),
    ] + row(['media_prev', 'custom', 'custom', 'custom', 'custom', 'media_next'], 50.4, 54.2, (38.6, 42.6), (61.6, 65.6))
      + row(['engine', 'parking_brake', 'hazard', 'blinker_left'], 60, 77.5, (1.8, 10.8), (32, 40.4))
      + row(['blinker_right', 'lights', 'high_beam', 'beacon', 'wipers', 'horn'], 60, 77.5, (41, 49.4), (89, 97.8))
      + row(['air_horn', 'engine_brake_toggle', 'lift_axle', 'trailer_attach', 'diff_lock', 'world_map', 'cam_next', 'menu'], 79.5, 97, (9.8, 19.4), (87.6, 96.6)),
    P=[
        gauge('speed', 19, 10.5, 17.5, max=120, a0=-120, a1=122), gauge('rpm', 56, 10, 17, max=3000, a0=-122, a1=122),
        gauge('fuel', 19.5, 27.5, 17, a0=-61, a1=60), gauge('air', 56.5, 28, 17, max=15, unit='bar', a0=-62, a1=62),
        live('gear', 81, 3.4, 94, 9), live('time', 80, 9.4, 96, 12.4), live('dist', 84, 13.4, 96.5, 15.7),
        tell('blinkL', 79, 17.5, 87.3, 21.6), tell('blinkR', 88.2, 17.5, 96.6, 21.6), tell('high', 80, 22.3, 95.5, 26.1),
        tell('park', 80, 26.5, 95.5, 30.3), tell('batt', 80, 30.8, 95.5, 34.8),
        rtext(34.5, 39.6, 79.4, 43.6),
        hot('media_play', 4.5, 39, 20, 46.6), hot('vol_up', 91, 39, 97, 42), hot('vol_down', 91, 43.2, 97, 46.2),
    ] + row(['media_prev', 'custom', 'custom', 'custom', 'custom', 'custom', 'media_next'], 44.7, 46.8, (33.8, 41.8), (82.3, 90.3))
      + row(['engine', 'parking_brake', 'hazard'], 49.5, 60.5, (2, 24.5), (53, 74.5))
      + [hot('blinker_left', 76.5, 49.5, 87.6, 60.5), hot('blinker_right', 88, 49.5, 99, 60.5)]
      + row(['lights', 'high_beam', 'beacon', 'wipers'], 62, 72.3, *_br9)
      + row(['horn', 'air_horn', 'engine_brake_toggle', 'lift_axle'], 73.5, 83.8, *_br9)
      + row(['trailer_attach', 'diff_lock', 'world_map', 'cam_next'], 85, 95.3, *_br9)
      + [hot('menu', 8, 96.7, 92, 100)],
)

# ---- 10 classic Nordic, grey --------------------------------------------------------------
_L10 = [0.25, 0.1, 0.5, 0.09]
_k = 0.885 / 0.915   # the phone crop was extended downwards after its grid was read
def _y(v): return round(v * _k, 2)
_c10 = ((2.5, 23.5), (77, 98.5))
S['old_volvo'] = dict(
    T=[
        gauge('speed', 14.8, 22.5, 11.2, max=120, a0=-124, a1=124), gauge('rpm', 38.8, 22.5, 10.8, max=2500, a0=-124, a1=116),
        gauge('fuel', 58.7, 13.8, 5.8, a0=-62, a1=62), gauge('air', 58.7, 34, 5.8, max=10, unit='bar', a0=-62, a1=62),
        live('gear', 73.6, 7, 79.6, 16), live('time', 85.8, 9.6, 94, 15.4), live('dist', 84, 19.8, 94, 24.8),
        tell('trailer', 72.8, 19.2, 80.2, 25.4),
        rtext(77.4, 34.2, 95.6, 39.4),
        hot('media_play', 69.6, 33.6, 75.4, 43.4),
    ] + row(['media_prev', 'vol_down', 'media_play', 'vol_up', 'media_next'], 41.4, 44.8, (76.8, 80.2), (92, 95.6))
      + row(['engine', 'parking_brake', 'retarder_up', 'hazard', 'blinker_left', 'blinker_right', 'lights', 'high_beam', 'beacon'], 51.5, 71.5, (2.6, 10.4), (88.4, 96.2), _L10)
      + row(['wipers', 'horn', 'air_horn', 'trailer_attach'], 78.5, 96.5, (2.3, 8.7), (27.5, 34))
      + row(['lift_axle', 'diff_lock'], 78.5, 96.5, (36.2, 42.8), (45, 51.6), [0.3, 0.11, 0.4, 0.09])
      + [hot('cruise', 53.8, 78.5, 60.4, 96.5)]
      + row(['world_map', 'ra_nav', 'cam_next', 'menu'], 78.5, 96.5, (63, 69.6), (90.4, 97)),
    P=[
        gauge('speed', 26.5, _y(13), 22.5, max=120, a0=-124, a1=124), gauge('rpm', 74.5, _y(13), 22.5, max=2500, a0=-124, a1=116),
        gauge('fuel', 15.5, _y(32.5), 13.5, a0=-62, a1=62), gauge('air', 85, _y(32.5), 13.5, max=10, unit='bar', a0=-62, a1=62),
        live('gear', 35.5, _y(27), 45.5, _y(31.2)), live('time', 50.5, _y(27.3), 66.5, _y(30.8)), live('dist', 48, _y(33.3), 66.5, _y(36.2)),
        tell('trailer', 34.5, _y(32.8), 45.5, _y(36.4)),
        rtext(33.5, _y(41.8), 86.5, _y(45.8)),
        hot('media_play', 4, _y(40.5), 21, _y(48.6)),
    ] + row(['media_prev', 'vol_down', 'media_play', 'vol_up'], _y(47), _y(49), (31, 41), (63.5, 73))
      + [hot('media_next', 77.5, _y(47), 89, _y(49))]
      + row(['engine', 'parking_brake', 'retarder_up', 'hazard'], _y(51.5), _y(61.2), *_c10, [0.25, 0.14, 0.5, 0.1])
      + row(['blinker_left', 'blinker_right', 'lights', 'high_beam'], _y(62), _y(71.5), *_c10, [0.25, 0.14, 0.5, 0.1])
      + row(['beacon', 'wipers', 'horn', 'air_horn'], _y(72.5), _y(82), *_c10)
      + row(['trailer_attach', 'lift_axle', 'diff_lock', 'cruise'], _y(83), _y(92.3), *_c10)
      + row(['world_map', 'ra_nav', 'cam_next', 'menu'], _y(93.5), 99.9, *_c10),
)


# ==== Corrections after checking every map against the art ===================================
def cols(fns, y0, y1, xs, led=None):
    """Keys that are NOT evenly spaced in the art: one (x0, x1) per key."""
    return [hot(fn, x[0], y0, x[1], y1, led) for fn, x in zip(fns, xs) if fn]

def centred(fns, y0, y1, centres, half, led=None):
    return cols(fns, y0, y1, [(c - half, c + half) for c in centres], led)

def drop(skin, size, pred):
    S[skin][size] = [w for w in S[skin][size] if not pred(w)]

def find(skin, size, **kw):
    out = [w for w in S[skin][size] if all(w.get(k) == v for k, v in kw.items())]
    assert out, (skin, size, kw)
    return out

def in_rows(y0, y1):
    return lambda w: w['t'] == 'hot' and y0 - 0.5 <= w['r'][1] <= y1

def rect(w, x0, y0, x1, y1): w['r'] = [x0, y0, x1 - x0, y1 - y0]

LOW = [0.22, 0.64, 0.56, 0.16]   # lamp in the lower third of a key

# 01: the lamps of the engine-brake and cruise keys sit low on the cap
for w in S['modern_us']['T']:
    if w.get('led') == BOT: w['led'] = LOW
drop('modern_us', 'P', lambda w: w.get('fn') in ('cruise', 'cruise_up') and w['r'][1] > 70)
S['modern_us']['P'] += cols(['cruise_down'], 70.8, 79.7, [(62.5, 79.5)]) + cols(['cruise_up'], 70.8, 79.7, [(82.5, 98.5)], [0.22, 0.78, 0.56, 0.13])

# 02
rect(find('modern_eu', 'T', field='eta')[0], 70, 7.2, 77.5, 10.8)

# 03: second and third rows are unevenly spaced
_fn2 = ['wipers', 'horn', 'air_horn', 'engine_brake_toggle', 'cruise_down', 'cruise_up', 'trailer_axle', 'lift_axle', 'trailer_attach']
_fn3 = ['diff_lock', 'cam_next', 'world_map', 'custom', 'custom', 'custom', 'custom', 'custom', 'menu']
drop('modern_br', 'T', in_rows(51, 98))
S['modern_br']['T'] += cols(_fn2, 51.4, 71.6, [(2.5, 12.2), (14.2, 23.1), (26.2, 35), (38, 46.6), (49.2, 55.8), (58, 65.4), (68, 75.8), (78.4, 87), (88.8, 97.4)], TOP)
S['modern_br']['T'] += cols(_fn3, 77, 97.2, [(2.5, 12.2), (14.2, 23.1), (26.5, 35.4), (38, 46.2), (48, 55), (58.8, 65.4), (68.4, 76.2), (78.4, 87), (88.8, 97.4)], TOP)
for w in S['modern_br']['P']:
    if w.get('fn') in ('parking_brake', 'hazard', 'beacon') and w['r'][1] < 40: w['led'] = TOP

# 04: first row is not evenly spaced; the CB set carries the music
drop('modern_heavy', 'T', in_rows(40, 41))
S['modern_heavy']['T'] += centred(['engine', 'hazard', 'beacon', 'custom', 'lights', 'wipers', 'horn', 'air_horn'], 40.4, 55.6, [7.5, 20.9, 32.9, 44.4, 56, 67.7, 79.5, 91.3], 5.1)
S['modern_heavy']['T'] += [fbar(40.2, 3.7, 44.3, 5.9), rtext(15.6, 17.2, 27.6, 24.2)] + centred(['media_prev', 'media_play', 'media_next'], 26.6, 33, [16, 21.9, 27.6], 2)
S['modern_heavy']['P'] += [rtext(24.6, 34.2, 48.4, 38.8)] + centred(['media_prev', 'media_play', 'media_next'], 39.8, 42.8, [28.6, 36.7, 45.2], 3)

# 05
rect(find('modern_rugged', 'T', field='gear')[0], 17.4, 4.2, 23.2, 18.8)
rect(find('modern_rugged', 'P', field='gear')[0], 42.5, 1.8, 53.5, 10.8)
drop('modern_rugged', 'T', lambda w: w.get('fn') == 'custom' and w['r'][1] > 78)
S['modern_rugged']['T'] += centred(['custom'] * 6, 78.6, 97.4, [43.9, 55, 65.5, 75.5, 84.5, 93.3], 3.9, TOP)
find('modern_rugged', 'P', fn='custom')[0].pop('led', None)          # the PTO guard has no lamp
find('modern_rugged', 'P', fn='custom')[1]['led'] = TOP              # AUX has one

# 06
_T = S['old_peterbilt']['T']
_T += [gauge('air', 92.5, 11.3, 5.2, max=150, unit='psi', a0=-100, a1=100), gauge('air', 92.5, 29.8, 5.2, max=150, unit='psi', a0=-100, a1=100)]
for w in _T + S['old_peterbilt']['P'] + S['old_kenworth']['T'] + S['old_kenworth']['P']:
    if w.get('tel') == 'never': w['tel'] = 'airlow'
find('old_kenworth', 'T', tel='airlow')[1]['tel'] = 'check'
rect(find('old_peterbilt', 'T', fn='engine')[0], 1.4, 53.8, 10.2, 71.6)
rect(find('old_peterbilt', 'T', t='rtext')[0], 39.4, 79.2, 57.8, 84.8)
for w in _T:
    if w.get('fn', '').startswith('engine_brake'): w['led'] = [0.3, 0.03, 0.4, 0.16]
_P = S['old_peterbilt']['P']
drop('old_peterbilt', 'P', lambda w: w.get('fn') == 'media_next' or (w['t'] == 'gauge' and w['field'] == 'air'))
S['old_peterbilt']['P'] += [gauge('air', 51.8, 28.3, 13.5, max=150, unit='psi', a0=-100, a1=100), gauge('air', 84.8, 28.3, 13.5, max=150, unit='psi', a0=-100, a1=100)]
rect(find('old_peterbilt', 'P', t='rtext')[0], 17.5, 94.2, 50.5, 97.6)
rect(find('old_peterbilt', 'P', fn='engine')[0], 10, 50, 28.5, 60.8)
find('old_peterbilt', 'P', fn='lift_axle')[0]['led'] = TOP

# 07
_T = S['old_kenworth']['T']
_T += [tell('trailer', 51, 28.4, 57.4, 33.6), hot('ra_nav', 48.4, 42.6, 51.9, 48.6), hot('screenshot', 52.4, 42.6, 55.9, 48.6), hot('world_map', 56.4, 42.6, 59.8, 48.6),
       hot('vol_down', 77.6, 49.2, 81.2, 52.4), hot('vol_up', 83.4, 49.2, 87, 52.4)]
rect(find('old_kenworth', 'T', t='rtext')[0], 72.6, 42.4, 91, 47.6)
for w in _T:
    if w['t'] == 'hot' and 55 < w['r'][1] < 58: w['r'][3] = 77.4 - w['r'][1]      # legends sit on plates under the keys
    if w.get('fn', '').startswith('engine_brake'): w['led'] = [0.2, 0.06, 0.6, 0.2]
drop('old_kenworth', 'T', lambda w: w['t'] == 'hot' and w['r'][1] > 79 and not w['fn'].startswith('engine_brake'))
S['old_kenworth']['T'] += cols(['cruise', 'lift_axle', 'trailer_axle', 'diff_lock', 'world_map', 'cam_next', 'menu'], 79.4, 98,
           [(18.8, 27.9), (30.4, 39.3), (41.9, 50.8), (53.6, 62.4), (67.6, 75.9), (78, 85.4), (88.4, 96.8)])
rect(find('old_kenworth', 'P', t='rtext')[0], 29.5, 49.8, 78, 53.8)
for w in S['old_kenworth']['P']:
    if w.get('fn', '').startswith('engine_brake'): w['led'] = [0.2, 0.06, 0.6, 0.2]

# 10: lamps that exist on single keys of the phone cut
find('old_volvo', 'P', fn='beacon')[0]['led'] = [0.25, 0.14, 0.5, 0.1]
for f in ('lift_axle', 'diff_lock'): find('old_volvo', 'P', fn=f)[0]['led'] = [0.3, 0.14, 0.4, 0.1]


# ==== Dials: pivot, sweep and scale read from close-ups of each instrument ====================
# n  = where the art's own (static) needle points, so it can be painted out
# a0 = angle of the scale's first mark, a1 = of its last one (degrees clockwise from 12 o'clock)
# nl = needle length as a fraction of the dial radius
def dial(skin, size, field, i=0, **kw):
    g = [w for w in S[skin][size] if w['t'] == 'gauge' and w['field'] == field][i]
    cy = kw.pop('cy', None)
    if cy is not None: g['c'][1] = cy
    g.update(kw)

for z in 'TP':
    dial('old_peterbilt', z, 'speed', max=120, unit='mph', a0=-120, a1=120, n=-3)
    dial('old_peterbilt', z, 'rpm', max=3000, a0=-120, a1=120, n=-4.5)
    for i in (0, 1): dial('old_peterbilt', z, 'air', i, n=53 if z == 'P' else 52)
    dial('old_kenworth', z, 'speed', max=80, unit='mph', a0=-131, a1=131, n=-131)
    dial('old_kenworth', z, 'rpm', max=3000, a0=-118, a1=121, n=-118 if z == 'T' else -115)
    dial('old_kenworth', z, 'air', max=150, unit='psi', pts=[[0, -48], [100, 0], [150, 45]], n=-47.5, nl=0.8)
    dial('old_scania', z, 'speed', a0=-123.5, a1=123, n=-123.5)
    dial('old_scania', z, 'rpm', a0=-119, a1=122, n=-116 if z == 'T' else -121.8)
    dial('old_scania', z, 'fuel', n=-18.5, nl=0.62, n0=0.22)
    dial('old_brazil', z, 'speed', a0=-120, a1=122, n=-121 if z == 'T' else -116.3)
    dial('old_brazil', z, 'rpm', a0=-123, a1=122, n=-123.5)
    dial('old_volvo', z, 'speed', a0=-123, a1=124, n=-123)
    dial('old_volvo', z, 'rpm', a0=-122, a1=116, n=-121 if z == 'T' else -124.4)
dial('old_peterbilt', 'T', 'fuel', a0=-56, a1=54, n=57)
dial('old_peterbilt', 'T', 'air', 0, max=150, unit='psi', a0=-100, a1=100, n=45)
dial('old_peterbilt', 'T', 'air', 1, n=52); dial('old_peterbilt', 'T', 'air', 2, n=52)
dial('old_peterbilt', 'P', 'fuel', a0=-62, a1=62, n=62)
dial('old_kenworth', 'T', 'fuel', a0=-52, a1=54, n=-51)
dial('old_kenworth', 'P', 'fuel', cy=34.4, a0=-50.5, a1=52, n=-50.5, nl=0.85)
dial('old_kenworth', 'P', 'air', cy=34.5)
dial('old_scania', 'T', 'fuel', a0=-72, a1=68); dial('old_scania', 'P', 'fuel', a0=-60, a1=60)
dial('old_scania', 'T', 'air', a0=-66, a1=64, n=0, nl=0.72); dial('old_scania', 'P', 'air', a0=-70, a1=70, n=-23, nl=0.72)
dial('old_brazil', 'T', 'fuel', cy=20.0, a0=-51, a1=55, n=-51, nl=0.72)
dial('old_brazil', 'T', 'air', cy=21.4, a0=-53, a1=52, n=-52.7, nl=0.8)
dial('old_brazil', 'P', 'fuel', cy=29.0, a0=-50, a1=52.5, n=-50, nl=0.8)
dial('old_brazil', 'P', 'air', cy=29.66, a0=-52, a1=51, n=-52.4, nl=0.78)
dial('old_volvo', 'T', 'fuel', a0=-70, a1=69, n=-70); dial('old_volvo', 'T', 'air', a0=-68, a1=68, n=0, nl=0.6)
dial('old_volvo', 'P', 'fuel', a0=-72, a1=66, n=-78); dial('old_volvo', 'P', 'air', a0=-70, a1=67, n=[-78, -100], nl=0.6)

dial('old_peterbilt', 'T', 'fuel', amber=True); dial('old_peterbilt', 'P', 'fuel', amber=True)

# readouts painted as a 12-hour clock with room for AM/PM
find('modern_us', 'T', field='trip2')[0]['h12'] = True
find('modern_heavy', 'T', field='time')[0]['h12'] = True


# ==== Round 2: radios, every key mapped, stickers ============================================
def to_knob(skin, size, tap=None, fn='media_play'):
    """The radio's round knob is the VOLUME: drag up/down to turn it. `tap` = what a short
    press does on radios that have no other play/pause key."""
    k = max([w for w in S[skin][size] if w['t'] == 'hot' and w['fn'] == fn], key=lambda w: w['r'][2] * w['r'][3])
    k['t'] = 'knob'; k.pop('fn'); k.pop('led', None)
    if tap: k['tap'] = tap

def seq(skin, size, y_lo, y_hi, fns):
    """Re-assign the keys of one painted row, left to right."""
    row_ = sorted([w for w in S[skin][size] if w['t'] == 'hot' and y_lo <= w['r'][1] <= y_hi], key=lambda w: w['r'][0])
    assert len(row_) == len(fns), (skin, size, len(row_), len(fns))
    for w, f in zip(row_, fns): w['fn'] = f

def customs(skin, size, fns):
    """Keys the art leaves without a truck function get a useful one with a game default key."""
    c = [w for w in S[skin][size] if w.get('fn') == 'custom']
    assert len(c) == len(fns), (skin, size, len(c))
    for w, f in zip(c, fns): w['fn'] = f

# classic radios: knob = volume, keys = previous / play / mute / next, presets = the game's own radio
to_knob('old_peterbilt', 'T'); seq('old_peterbilt', 'T', 88.5, 90, ['media_prev', 'media_play', 'vol_mute', 'media_next'])
to_knob('old_peterbilt', 'P', tap='media_play')
to_knob('old_kenworth', 'T'); find('old_kenworth', 'T', fn='vol_down')[0]['fn'] = 'media_play'; find('old_kenworth', 'T', fn='vol_up')[0]['fn'] = 'vol_mute'
to_knob('old_kenworth', 'P', tap='media_play')
to_knob('old_scania', 'T'); seq('old_scania', 'T', 28, 28.45, ['media_prev', 'media_play', 'vol_mute', 'media_next'])
seq('old_scania', 'T', 32.5, 33.5, ['radio', 'radio_prev', 'radio_next', 'vol_down', 'vol_up'])
to_knob('old_scania', 'P'); seq('old_scania', 'P', 45.5, 46.2, ['radio', 'radio_prev', 'radio_next', 'vol_mute', 'media_play'])
to_knob('old_brazil', 'T'); seq('old_brazil', 'T', 50, 51, ['media_prev', 'radio', 'radio_prev', 'radio_next', 'vol_mute', 'media_next'])
S['old_brazil']['T'].append(hot('media_play', 66.6, 50.4, 70.6, 54.2))
to_knob('old_brazil', 'P'); seq('old_brazil', 'P', 44.5, 45, ['media_prev', 'radio', 'radio_prev', 'radio_next', 'vol_mute', 'media_next', 'media_play'])
to_knob('old_volvo', 'T'); to_knob('old_volvo', 'P')
# 04: on the CB set the first knob is the volume (tap = play/pause), the others change track
for z in 'TP':
    ks = sorted([w for w in S['modern_heavy'][z] if w.get('fn') in ('media_prev', 'media_play', 'media_next')], key=lambda w: w['r'][0])
    ks[0]['fn'] = 'media_play'; ks[1]['fn'] = 'media_prev'; ks[2]['fn'] = 'media_next'
    to_knob('modern_heavy', z, tap='media_play')

customs('modern_eu', 'T', ['wipers']); customs('modern_eu', 'P', ['wipers'])
customs('modern_br', 'T', ['activate', 'ra_nav', 'ra_job', 'mirrors', 'quick_save'])
customs('modern_heavy', 'T', ['dash_display', 'cam_interior', 'cam_chase', 'cam_top', 'cam_bumper', 'high_beam'])
customs('modern_heavy', 'P', ['high_beam', 'dash_display'])
customs('modern_rugged', 'T', ['dash_display', 'mirrors', 'activate', 'ra_job', 'ra_diag', 'ra_info', 'truck_adjust', 'quick_save'])
customs('modern_rugged', 'P', ['dash_display', 'activate'])
for _s in S.values():
    for _z in 'TP': assert not [w for w in _s[_z] if w.get('fn') == 'custom']

# Stickers (optional layer, drawn by the app, never baked into the art): only where the
# picture has a blank surface big enough to take one.
def sticker(art, x0, y0, x1, y1, rot): return dict(t='sticker', art=art, r=[x0, y0, x1 - x0, y1 - y0], rot=rot)
# (percentages of the picture BEFORE the extra key row is added; each sticker is centred on its plate)
S['old_brazil']['T'] += [sticker('gratidao', 1.2, 40.4, 18.6, 55.1, -5), sticker('cwb', 84.6, 38.9, 95.0, 56.5, 6)]
S['old_scania']['T'] += [sticker('cwb', 86.2, 75.5, 96.4, 90.5, -4)]
S['old_scania']['P'] += [sticker('cwb', 60, 91.3, 80, 98.6, 3)]


# ==== The author's mark: a very small frog sticker on every panel ============================
# Placed automatically in the free spot nearest to a corner, never over a key, readout or dial.
def place_mark(skin, size, ar):
    wdt = 3.0 if size == 'T' else 5.2
    hgt = wdt * ar
    boxes = []
    for w in S[skin][size]:
        if 'c' in w:
            c = w['c']; boxes.append((c[0] - c[2], c[1] - c[2] * ar, c[0] + c[2], c[1] + c[2] * ar))
        else:
            r = w['r']; boxes.append((r[0], r[1], r[0] + r[2], r[1] + r[3]))
    best = None
    for yi in range(0, 200):
        for xi in range(0, 200):
            x = 0.6 + xi * (98.8 - wdt) / 199; y = 0.6 + yi * (98.8 - hgt) / 199
            if any(x < b[2] + 0.5 and b[0] - 0.5 < x + wdt and y < b[3] + 0.5 and b[1] - 0.5 < y + hgt for b in boxes): continue
            # prefer the bottom-right corner, then the other corners
            d = min((98.8 - wdt - x) ** 2 + ((98.8 - hgt - y) / ar) ** 2,
                    1.3 * ((x - 0.6) ** 2 + ((98.8 - hgt - y) / ar) ** 2),
                    1.6 * ((98.8 - wdt - x) ** 2 + ((y - 0.6) / ar) ** 2))
            if best is None or d < best[0]: best = (d, x, y)
    assert best, (skin, size)
    S[skin][size].append(dict(t='sticker', art='frog', r=[round(best[1], 2), round(best[2], 2), wdt, round(hgt, 2)], rot=-8 if size == 'T' else 6, mark=1))


# ==== Classic panels: one key barrel instead of the start button ==============================
# Tap 1 turns the key to "electrics", tap 2 starts the engine, tap 3 switches everything off.
# c = centre of the original start button and the barrel's radius (% of the picture width).
# The modern panels keep their single START/STOP button exactly as painted.
def to_barrel(skin, size, cx, cy, r, lamp=None):
    e = find(skin, size, fn='engine')[0]
    i = S[skin][size].index(e)
    S[skin][size][i] = dict(t='ign', c=[cx, cy, r])
    # a status lamp painted on the original key now shows "electrics on"
    if lamp: S[skin][size].insert(i, tell('electric', *lamp))

to_barrel('old_peterbilt', 'T', 5.6, 58.9, 4.35);  to_barrel('old_peterbilt', 'P', 19, 54, 9.2)
to_barrel('old_kenworth', 'T', 7.6, 63.3, 3.7);   to_barrel('old_kenworth', 'P', 17.5, 63, 6.8)
# These three have no round button to put a barrel in, so the three stages are built from the
# control the panel already has (see panels.py): the START rocker's own lamp, or the rotary knob.
def to_stage(skin, size, style):
    e = find(skin, size, fn='engine')[0]
    S[skin][size][S[skin][size].index(e)] = dict(t='ign', st=style, r=e['r'], **({'led': e['led']} if e.get('led') else {}))

for _z in 'TP':
    to_stage('old_scania', _z, 'lamp'); to_stage('old_volvo', _z, 'lamp'); to_stage('old_brazil', _z, 'knob')


# ==== Enter key on every panel ================================================================
# The art has no Enter key, so on each cut one existing key is repainted as ENTER (pictogram
# and legend redrawn in that key's own colours by mkskins). The key given up is the least
# missed one that cut has, in this order; a key already set to Enter (blank caps) is used first.
ENTER_FROM = ['activate', 'screenshot', 'ra_modes', 'ra_job', 'quick_save', 'mirrors', 'truck_adjust', 'ra_info', 'ra_diag',
              'dash_display', 'light_horn', 'cam_top', 'cam_bumper', 'cam_chase', 'cam_interior', 'ra_nav', 'cam_next']
for _k, _s in S.items():
    for _z in 'TP':
        _c = [w for f in ENTER_FROM for w in _s[_z] if w.get('fn') == f and w['t'] == 'hot']
        assert _c, (_k, _z)
        _c[0]['was'] = _c[0]['fn']; _c[0]['fn'] = 'activate'; _c[0]['enter'] = 1
        # a second Enter left over from the blank caps goes back to a useful function
        for w in _s[_z]:
            if w.get('fn') == 'activate' and not w.get('enter'): w['fn'] = 'ra_modes'

# icon-only button in a status bar (its touch area is much taller than the icon)
find('modern_us', 'T', fn='activate')[0]['io'] = 1


# Hand corrections to measured key caps: (panel, cut, function) -> (x0, y0, x1, y1) as fractions of the mapped area
CAP_FIX = {
    # the toggle lever only: the lamp above it and the name under it stay still when it flips
    ('old_peterbilt', 'T', 'engine_brake_toggle'): (0.12, 0.2, 0.88, 0.72),
}


# ---- Modern panels: the START/STOP button is staged too (electrics, engine, off) ---------------
for _k in ('modern_us', 'modern_eu', 'modern_br', 'modern_heavy', 'modern_rugged'):
    for _z in 'TP': to_stage(_k, _z, 'btn')

# (Every panel gets its own separate wiper-on and wiper-off keys in plan.py.)

# the four tall camera keys of 04 carry their pictogram low on the cap, under a plain metal top
for _w in S['modern_heavy']['T']:
    if _w.get('fn') in ('cam_interior', 'cam_chase', 'cam_top', 'cam_bumper'): _w['iz'] = (.62, .9)
