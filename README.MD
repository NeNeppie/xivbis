# XiVBiS - In Development

THIS IS BIS BRUTE FORCING BITCH!!!

We clown in this muthafucka betta
take yo sensitive ass back to The Balance

## Installation

Soon™️

## DA RULES

### Damage stage `[1]`:

The foundation. Stat & Damage calculations

    ✅ Support for auto attacks
    ✅ Support for DoTs (affected by speed)
    🟨 Support for guaranteed crits (Reassemble, etc.)
    ✅ Support for party buffs (all types)
    - Support for pets:
        - Damage dealing pets (SMN, Queen, Esteem)
        - Trait bonus for SCH and SMN pets (+30%) [3]
    - Healing and HP calculations
    🟨 Support for ALL Equipment levels

### Gearset stage `[2]`:

Can be divided into sub-stages of Xivapi Interaction `[2.1]`, Backend `[2.2]` and Base Frontend `[2.3]`.

The logic stage that binds all systems together via "Gearsets"

    ✅ Getting item list [2.1]
    ✅ Link items to stats [2.2]
    ✅ "Build" gearset [2.3]
        ✅ Adding items
        ✅ Removing items
        ✅ Stat calculation
    - Support for materia [2.2/2.3]
    - Support for food / potions [2.2/2.3]
    - Item Stat display + Total Stat display redesign [2.3]
    ✅ Simulation overview window
    - DPS display, at-glance view for all added simulations

### Rotation stage `[3]`:

Implementing realistic damage calculation by simulating a damage rotation for a set amount of time.

    ✅ Calculating Autos, accounting for SkS and weapon type
    ✅ Supporting action types:
        ✅ GCDs
        ✅ oGCDs (weaving, anim locks, etc.)
        ✅ DoTs
        ✅ Combos
        ✅ Status granters / inflicters
        ✅ Autoattacks
    - Add support for prepull setup
    - Add support for potion uses
    - Add support for party buffs & bursts
    - Level backwards compatiblity

#### Job Status Table

|         Job | Actions | Rotation |
| ----------: | :-----: | :------: |
|     Paladin |   ❌    |    ❌    |
|     Warrior |   ❌    |    ❌    |
| Dark Knight |   ❌    |    ❌    |
|  Gunbreaker |   ❌    |    ❌    |
|        Monk |   ❌    |    ❌    |
|     Dragoon |   ✔️    |    ✔️    |
|       Ninja |   ❌    |    ❌    |
|     Samurai |   ❌    |    ❌    |
|      Reaper |   ❌    |    ❌    |
|       Viper |   ❌    |    ❌    |
|        Bard |   ❌    |    ❌    |
|   Machinist |   ❌    |    ❌    |
|      Dancer |   ❌    |    ❌    |
|  White Mage |   ❌    |    ❌    |
|     Scholar |   ❌    |    ❌    |
| Astrologian |   ❌    |    ❌    |
|        Sage |   ❌    |    ❌    |
|  Black Mage |   ❌    |    ❌    |
|    Summoner |   ❌    |    ❌    |
|    Red Mage |   ❌    |    ❌    |
| Pictomancer |   ❌    |    ❌    |
|   Blue Mage |   TBD   |   TBD    |

### Bruteforce stage `[4]`:

Implmenting an algorithm that solves for BiS given "targets" and "limits"

> init Gearset -> add/replace piece of gear -> run simulation -> compare dps -> repeat

    - Solver Parameters
        - GCD Speed, in a range or enforcing a target speed value
        - Ilvl Range of gear used
        - Job Level
        - Ilvl Sync to determine materia usage
        - Materia / Food inclusion
    🟨 Basic algorithm
        ✅ Iterating gear list and equipping gear pieces one by one
        ✅ Comparing dps between iterations or "nodes"
    - Materia support as an added complexity layer
    - Algorithm optimizations
        - Primary algorithm
        - Materia algorithm
    - Food support (technically acts as an extra gear piece)

## Bugs, Issues & Todo

- node.js command-line arguments?
- Frontend:
  - Mobile layout
  - Materia circles assets
  - Job Resource Gauge assets
  - IDs for all status effects
  - Extending rotations, maybe algorithmically?
