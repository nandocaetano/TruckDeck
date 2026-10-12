// GENERATED panel geometry. Modern control groups are mounted as real CSS grids by app.js.
'use strict';
const modernKey=(id,fn,g,extra)=>Object.assign({t:'kbd',k:fn==='hazard'?'hazard':'rocker',fn,g,r:[0,0,1,1],id},extra||{});
const modernSet=(prefix,g,fns)=>fns.map((fn,i)=>modernKey(prefix+(i+1),fn,g));
const modernSystem=()=>[
  modernKey('t0','quick_save','system',{mini:1}),
  modernKey('t1','world_map','system',{mini:1}),
  modernKey('t2','activate','system',{mini:1})
];
const upperFns=['engine','parking_brake','hazard','lights','high_beam','beacon','wipers','wipers_back','lane_assist','emergency_brake','light_horn','horn'];
const brakeFns=['engine_brake_down','engine_brake_toggle','engine_brake_up','retarder_down','retarder_auto','retarder_up','trailer_attach','trailer_brake','diff_lock'];
const utilityFns=['cruise_down','cruise','cruise_resume','susp_front_up','susp_rear_up','susp_reset','susp_front_down','susp_rear_down','mirrors'];

SKINS.eu_frame={
  T:{ar:2.333333,frame:1,w:[
    {t:'gps',hero:1,r:[34.1,6.2,28,16.9],id:'w_drive'},
    {t:'rtext',two:true,utility:1,r:[67.2,6.2,28,16.9],id:'w_media',bg:'#010203',ink:'#d9f4ff'},
    ...modernSet('u','upper',upperFns),
    ...modernSet('b','brakes',brakeFns),
    ...modernSet('c','utility',utilityFns),
    ...modernSystem()
  ]},
  P:{ar:.666667,frame:1,w:[
    {t:'gps',hero:1,r:[10,8.2,80,27.2],id:'w_drive'},
    ...modernSet('u','upper',upperFns),
    ...modernSet('b','brakes',brakeFns),
    ...modernSet('c','utility',utilityFns),
    ...modernSystem()
  ]}
};
