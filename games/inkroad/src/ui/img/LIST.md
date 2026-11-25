# InkRoad UI images

All webp. Made by `games/inkroad/dev/art/ui/cut.py` from `dev/art/ui/raw/` (ElevenLabs flow "InkRoad UI art"). Alpha unless marked "opaque". Key = file name without `.webp`.

## portraits/ (bust, facing slightly right, 320 px tall, width varies, bottom-aligned)
| Key | Use |
|---|---|
| zaza, zaza_upset | Fennec fox traffic engineer: normal, upset |
| miko, miko_upset | Meerkat head of parking |
| juma, juma_upset | Camel, buses and metro |
| pim, pim_upset | Jerboa treasurer |
| sulo, sulo_stern | Tortoise chair of the Council: normal, stern |
| hedgehog, gazelle, owl, flamingo, oryx, sandcat, gecko, pelican, jerboa2, badger, otter, goose, seal, stork | Residents (one mood, 320 px max). Otter, goose, seal, stork, badger = northern town |

## tools/ (96 x 96)
Build tools: street, avenue, boulevard, highway, remove, junction, flyover, underpass, kerb, parking, toll, bus, buslane, tram, metro, boat, oneway, square, zone.
Groups: group_roads, group_junctions, group_parking, group_prices, group_transit.
Overlays: ov_flow, ov_parking, ov_anger, ov_money.
Stat bars: bar_trips, bar_parking, bar_cost, bar_streets.

## tech/ (128 x 128)
smart_signals, scan_car, parking_app, tow_trucks, staggered_hours, school_buses, night_works, traffic_forecast, express_bus, quiet_asphalt, resident_permits, park_and_ride_app, electric_buses, drone_patrol. (The two app icons show the universal blue parking sign.)

## materials/
| Key | Size | Use |
|---|---|---|
| paper | 512, opaque, seamless | Panel texture, very calm cream |
| desk_leather | 512, opaque, seamless | Desk background (dark) |
| desk_wood | 512, opaque, seamless | Desk background alternative |
| stamp_ring | 256 | Red-brown rubber stamp ring, empty centre |
| plate_blank | 384 x 122 | Empty number plate |
| envelope | 256 x 152 | Council letter envelope |
| tape | 192 x 111 | Strip of tape |
| wax_seal | 160 x 166 | Seal with a road motif |

## pictures/ (opaque)
| Key | Size | Use |
|---|---|---|
| menu_key_art | 1920 x 1080 | Menu; left third is calm for the title |
| city_saffron_bay, city_old_harbour, city_twin_isles, city_seven_hills, city_cross_rivers | 640 x 400 | City cards |
| end_replaced | 960 x 540 | Replaced end card |
| end_city_done | 960 x 540 | City done end card |
| cover_square | 1024 x 1024 | Website cover, no text |

Note: menu_key_art and end cards are upscaled from 1280 x 720 sources. `src/ui/pics.ts` did not exist yet, so keys follow the lists above.
