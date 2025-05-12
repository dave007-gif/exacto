//-------------------------------------------------PLEMINARIES-------------------------------------------------------//

function loadForm(method) {
  console.log("Loading form for method:", method);

  let formHTML = "";

  switch (method) {
    case 'site_setup':
      formHTML = `
        <h4>Site Setup & Mobilization</h4>
        <form id="siteSetupForm" onsubmit="calculateEstimate('site_setup', event)">
          <div class="form-group">
            <label for="workers">Number of Workers:</label>
            <input type="number" id="workers" placeholder="Enter number of workers" required>
          </div>

          <div class="form-group">
            <label for="hours">Working Hours:</label>
            <input type="number" id="hours" placeholder="Enter working hours" required>
          </div>

          <div class="form-group">
            <label for="equipment">Equipment Rental Cost (₵):</label>
            <input type="number" id="equipment" placeholder="Enter rental cost" required>
          </div>

          <div class="form-group">
            <label for="materials">Material Cost (₵):</label>
            <input type="number" id="materials" placeholder="Enter material cost" required>
          </div>

          <button type="submit">Estimate</button>
        </form>
      `;
      break;


    case 'setting_out':
      formHTML = `
        <h3>Setting Out</h3>
        <p><strong>Description:</strong> Accurately marking the layout of the building on the site using pegs, strings, and measurement tools based on approved building plans.</p>
        <p><strong>Note:</strong> Typically involves site engineers or foremen and 2–3 assistants. Tools include tape measures, levels, and theodolites.</p>
    
        <form id="settingOutForm" onsubmit="calculateSettingOut(event)">
          <div class="form-group">
            <label for="workingHours">Working Hours:</label>
            <input type="number" id="workingHours" name="workingHours" required min="1" value="8">
          </div>
    
          <div class="form-group">
            <label for="crewSize">Crew Size:</label>
            <input type="number" id="crewSize" name="crewSize" required min="1" value="3">
          </div>
    
          <button type="submit">Estimate</button>
        </form>
      `;
      break;
      


    case 'site_clearance':
      formHTML = `
        <h3>Site Clearance</h3>
        <p>Clear the land of vegetation, debris, and obstructions in preparation for construction.</p>
        
        <form id="site-clearance-form" onsubmit="calculateSiteClearance(event)">
          <div class="form-group">
            <label for="area">Area to clear (m²):</label>
            <input type="number" id="area" required>
          </div>
    
          <div class="form-group">
            <label for="hours">Estimated Working Hours:</label>
            <input type="number" id="hours" required>
          </div>
    
          <div class="form-group">
            <label for="crew">Crew Size (optional):</label>
            <input type="number" id="crew" placeholder="Default: 3">
          </div>
    
          <button type="submit">Calculate</button>
        </form>
      `;
      break;
      
    case 'topsoil_excavation':
      formHTML = `
        <h3>Topsoil Excavation</h3>
        <p><strong>Description:</strong> Removing the top layer of soil (usually 150–300mm deep) to prepare the site for construction.</p>
        <p><strong>Purpose:</strong> To clear organic materials that may affect foundation stability.</p>
        <p><strong>Note:</strong> Depth, area, and equipment used affect time and cost.</p>
    
        <form id="topsoilExcavationForm" onsubmit="calculateTopsoilExcavation(event)">
          <div class="form-group">
            <label for="area">Excavation Area (m²):</label>
            <input type="number" id="area" placeholder="e.g. 100" required>
          </div>
    
          <div class="form-group">
            <label for="depth">Depth (mm):</label>
            <input type="number" id="depth" placeholder="e.g. 200" required>
          </div>
    
          <div class="form-group">
            <label for="workHours">Estimated Working Hours:</label>
            <input type="number" id="workHours" placeholder="e.g. 8">
          </div>
    
          <button type="submit">Calculate</button>
        </form>
      `;
      break;
      

    case 'trench_excavation':
      formHTML = `
        <h3>Trench Excavation</h3>
        <p><strong>Description:</strong> Excavating trenches for foundation footings, drainage, or utility services.</p>
        <p><strong>Purpose:</strong> To provide a narrow, deep excavation for structural or service installations.</p>
        <p><strong>Note:</strong> Consider trench length, width, and depth for accurate cost.</p>
    
        <form id="trenchExcavationForm" onsubmit="calculateTrenchExcavation(event)">
          <div class="form-group">
            <label for="trenchLength">Length of Trench (m):</label>
            <input type="number" id="trenchLength" placeholder="e.g. 30" required>
          </div>
    
          <div class="form-group">
            <label for="trenchWidth">Width of Trench (m):</label>
            <input type="number" id="trenchWidth" placeholder="e.g. 0.6" required>
          </div>
    
          <div class="form-group">
            <label for="trenchDepth">Depth of Trench (m):</label>
            <input type="number" id="trenchDepth" placeholder="e.g. 1.2" required>
          </div>
    
          <div class="form-group">
            <label for="trenchHours">Estimated Working Hours:</label>
            <input type="number" id="trenchHours" placeholder="e.g. 12">
          </div>
    
          <button type="submit">Calculate</button>
        </form>
      `;
      break;
      

    case 'pit_excavation':
      formHTML = `
        <h3>Pit Excavation</h3>
        <p><strong>Description:</strong> Excavation of pits for manholes, soakaways, or column bases.</p>
        <p><strong>Purpose:</strong> To create deep, localized holes for structural or drainage elements.</p>
        <p><strong>Note:</strong> Input dimensions carefully to estimate material volume and labor.</p>
    
        <form id="pitExcavationForm" onsubmit="calculatePitExcavation(event)">
          <div class="form-group">
            <label for="pitCount">Number of Pits:</label>
            <input type="number" id="pitCount" placeholder="e.g. 4" required>
          </div>
    
          <div class="form-group">
            <label for="pitLength">Length of Each Pit (m):</label>
            <input type="number" id="pitLength" placeholder="e.g. 1" required>
          </div>
    
          <div class="form-group">
            <label for="pitWidth">Width of Each Pit (m):</label>
            <input type="number" id="pitWidth" placeholder="e.g. 1" required>
          </div>
    
          <div class="form-group">
            <label for="pitDepth">Depth of Each Pit (m):</label>
            <input type="number" id="pitDepth" placeholder="e.g. 2" required>
          </div>
    
          <div class="form-group">
            <label for="pitHours">Estimated Working Hours:</label>
            <input type="number" id="pitHours" placeholder="e.g. 6">
          </div>
    
          <button type="submit">Calculate</button>
        </form>
      `;
      break;
    

    case 'hardcore_filling':
      formHTML = `
        <h3>Hardcore Filling</h3>
        <p><strong>Description:</strong> Filling excavated areas with hardcore (crushed stones) to stabilize the foundation base.</p>
        <p><strong>Purpose:</strong> To provide a firm base for blinding and structural concrete layers.</p>
        <p><strong>Note:</strong> Ensure accurate measurements for proper compaction and leveling.</p>
    
        <form id="hardcoreFillingForm" onsubmit="calculateHardcoreFilling(event)">
          <div class="form-group">
            <label for="hardcoreLength">Length (m):</label>
            <input type="number" id="hardcoreLength" placeholder="e.g. 10" required>
          </div>
    
          <div class="form-group">
            <label for="hardcoreWidth">Width (m):</label>
            <input type="number" id="hardcoreWidth" placeholder="e.g. 6" required>
          </div>
    
          <div class="form-group">
            <label for="hardcoreDepth">Depth (m):</label>
            <input type="number" id="hardcoreDepth" placeholder="e.g. 0.3" required>
          </div>
    
          <div class="form-group">
            <label for="hardcoreHours">Estimated Working Hours:</label>
            <input type="number" id="hardcoreHours" placeholder="e.g. 4">
          </div>
    
          <button type="submit">Calculate</button>
        </form>
      `;
      break;
      
    case 'blinding':
      formHTML = `
        <h3>Blinding Concrete</h3>
        <p>This method involves laying a thin layer of concrete over the base to create a clean and level working surface for subsequent work.</p>
        <p><strong>Purpose:</strong> To provide a clean surface, reduce contamination, and improve accuracy during foundation work.</p>
        <p><strong>Note:</strong> This is typically a 50mm thick concrete layer using lean mix.</p>
        
        <form id="blinding-concrete-form" onsubmit="calculateBlindingConcrete(event)">
          <div class="form-group">
            <label for="blinding-area">Area to blind (in m²):</label>
            <input type="number" id="blinding-area" required>
          </div>
        
          <div class="form-group">
            <label for="blinding-hours">Estimated working hours:</label>
            <input type="number" id="blinding-hours" required>
          </div>
        
          <div class="form-group">
            <label for="blinding-crew">Crew size (optional):</label>
            <input type="number" id="blinding-crew" placeholder="Default: 4">
          </div>
        
          <button type="submit">Calculate</button>
        </form>
      `;
      break;
      
        
    case 'foundation_concrete':
      formHTML = `
        <h3>Foundation Concrete</h3>
        <p><strong>Description:</strong> Structural concrete used for strip or pad foundations.</p>
        <p><strong>Purpose:</strong> Distributes loads from the structure to the ground.</p>
        <p><strong>Note:</strong> Typical mix is 1:2:4 or 1:3:6. Concrete is poured into trenches after reinforcement.</p>

        <div class="form-group">
          <label for="fcLength">Length (m):</label>
          <input type="number" id="fcLength" placeholder="e.g. 15" required>
        </div>
        <div class="form-group">
          <label for="fcWidth">Width (m):</label>
          <input type="number" id="fcWidth" placeholder="e.g. 0.6" required>
        </div>
        <div class="form-group">
          <label for="fcDepth">Depth (m):</label>
          <input type="number" id="fcDepth" placeholder="e.g. 0.3" required>
        </div>
        <div class="form-group">
          <label for="fcHours">Estimated Working Hours:</label>
          <input type="number" id="fcHours" placeholder="e.g. 8">
        </div>

        <button onclick="calculateFoundationConcrete()">Calculate</button>
      `;
      break;

    case 'column_concrete':
      formHTML = `
        <h3>Column Concrete Work</h3>
        <p><strong>Description:</strong> Vertical structural members carrying loads from slabs/beams to foundations.</p>
        <p><strong>Purpose:</strong> Provides vertical support and resists axial loads.</p>
        <p><strong>Note:</strong> Usually reinforced with steel. Size and spacing vary by structural design.</p>

        <div class="form-group">
          <label for="ccHeight">Height (m):</label>
          <input type="number" id="ccHeight" placeholder="e.g. 3" required>
        </div>
        <div class="form-group">
          <label for="ccWidth">Width (m):</label>
          <input type="number" id="ccWidth" placeholder="e.g. 0.3" required>
        </div>
        <div class="form-group">
          <label for="ccDepth">Depth (m):</label>
          <input type="number" id="ccDepth" placeholder="e.g. 0.3" required>
        </div>
        <div class="form-group">
          <label for="ccNumber">Number of Columns:</label>
          <input type="number" id="ccNumber" placeholder="e.g. 8" required>
        </div>
        <div class="form-group">
          <label for="ccHours">Estimated Working Hours:</label>
          <input type="number" id="ccHours" placeholder="e.g. 10">
        </div>

        <button onclick="calculateColumnConcrete()">Calculate</button>
      `;
      break;

    case "ground_floor_slab":
      formHTML = `
        <h3>Ground Floor Slab</h3>
        <p><strong>Description:</strong> A flat concrete surface laid over the foundation base.</p>
        <p><strong>Purpose:</strong> Forms the base for internal flooring, distributing loads evenly.</p>
        <p><strong>Note:</strong> Ensure compaction and proper curing to avoid cracking.</p>

        <div class="form-group">
          <label for="gfsLength">Length (m):</label>
          <input type="number" id="gfsLength" placeholder="e.g. 10" required>
        </div>
        <div class="form-group">
          <label for="gfsWidth">Width (m):</label>
          <input type="number" id="gfsWidth" placeholder="e.g. 8" required>
        </div>
        <div class="form-group">
          <label for="gfsThickness">Thickness (m):</label>
          <input type="number" id="gfsThickness" placeholder="e.g. 0.15" required>
        </div>
        <div class="form-group">
          <label for="gfsHours">Estimated Working Hours:</label>
          <input type="number" id="gfsHours" placeholder="e.g. 15">
        </div>

        <button onclick="calculateGroundFloorSlab()">Calculate</button>
      `;
      break;

    case "upper_floor_slab":
      formHTML = `
        <h3>Upper Floor Slab (Optional)</h3>
        <p><strong>Description:</strong> A suspended concrete floor slab cast above ground level.</p>
        <p><strong>Purpose:</strong> Creates multiple levels in a structure and distributes loads.</p>
        <p><strong>Note:</strong> Requires formwork, scaffolding, and precise reinforcement.</p>

        <div class="form-group">
          <label for="ufsLength">Length (m):</label>
          <input type="number" id="ufsLength" placeholder="e.g. 10" required>
        </div>
        <div class="form-group">
          <label for="ufsWidth">Width (m):</label>
          <input type="number" id="ufsWidth" placeholder="e.g. 8" required>
        </div>
        <div class="form-group">
          <label for="ufsThickness">Thickness (m):</label>
          <input type="number" id="ufsThickness" placeholder="e.g. 0.15" required>
        </div>
        <div class="form-group">
          <label for="ufsHours">Estimated Working Hours:</label>
          <input type="number" id="ufsHours" placeholder="e.g. 20">
        </div>

        <button onclick="calculateUpperFloorSlab()">Calculate</button>
      `;
      break;


    case "steel_cutting_bending":
      formHTML = `
        <h3>Steel Cutting & Bending</h3>
        <p><strong>Description:</strong> Preparing reinforcement bars by cutting and bending according to structural drawings.</p>
        <p><strong>Purpose:</strong> Ensures proper reinforcement placement and structural strength.</p>
        <p><strong>Note:</strong> Usually done off-site or on-site with reinforcement schedules.</p>

        <label for="scbKg">Total Steel Required (kg):</label>
        <input type="number" id="scbKg" placeholder="e.g. 600" required>

        <label for="scbHours">Estimated Working Hours:</label>
        <input type="number" id="scbHours" placeholder="e.g. 10">

        <button onclick="calculateSteelCuttingBending()">Calculate</button>
      `;
      break;

    case "iron_rod":
      formHTML = `
        <h3>Iron Rod Application</h3>
        <p><strong>Description:</strong> Placement and tying of reinforcement bars at the construction site.</p>
        <p><strong>Purpose:</strong> Ensures reinforcement is securely fixed in place before concrete is poured.</p>
        <p><strong>Note:</strong> Should follow reinforcement layout and bar bending schedule.</p>

        <label for="iraKg">Reinforcement Weight (kg):</label>
        <input type="number" id="iraKg" placeholder="e.g. 400" required>

        <label for="iraHours">Estimated Working Hours:</label>
        <input type="number" id="iraHours" placeholder="e.g. 8">

        <button onclick="calculateIronRodApplication()">Calculate</button>
      `;
      break;

    case "pillar_reinforcement":
      formHTML = `
        <h3>Pillar Reinforcement</h3>
        <p><strong>Description:</strong> Installation of vertical reinforcement in columns or pillars before casting.</p>
        <p><strong>Purpose:</strong> Enhances vertical load-bearing capacity of the structure.</p>
        <p><strong>Note:</strong> Should be based on design drawings and bar schedules.</p>

        <label for="pillarCount">Number of Pillars:</label>
        <input type="number" id="pillarCount" placeholder="e.g. 6" required>

        <label for="steelPerPillar">Steel per Pillar (kg):</label>
        <input type="number" id="steelPerPillar" placeholder="e.g. 18" required>

        <label for="pillarHours">Estimated Working Hours:</label>
        <input type="number" id="pillarHours" placeholder="e.g. 5">

        <button onclick="calculatePillarReinforcement()">Calculate</button>
      `;
      break; 

    case "damp_proof_membrane":
      formHTML = `
        <h3>Damp Proof Membrane</h3>
        <p><strong>Description:</strong> Laying of plastic sheeting to prevent moisture from seeping through concrete floors.</p>
        <p><strong>Purpose:</strong> Ensures protection of structure from rising damp.</p>
        <p><strong>Note:</strong> Membrane should cover all floor areas before concrete work.</p>
    
        <label for="dpmArea">Area to Cover (m²):</label>
        <input type="number" id="dpmArea" placeholder="e.g. 50" required>
    
        <label for="dpmHours">Estimated Working Hours:</label>
        <input type="number" id="dpmHours" placeholder="e.g. 4">
    
        <button onclick="calculateDPM()">Calculate</button>
      `;
      break;

    case "blockwork_foundation":
      formHTML = `
        <h3>Block Work (Foundation)</h3>
        <p><strong>Description:</strong> Laying of foundation walls using concrete blocks below ground level.</p>
        <p><strong>Purpose:</strong> Forms a strong base structure for the walls above.</p>
        <p><strong>Note:</strong> Ensure alignment and bonding of blocks is properly checked.</p>
    
        <label for="blockLength">Total Wall Length (m):</label>
        <input type="number" id="blockLength" placeholder="e.g. 30" required>
    
        <label for="blockHeight">Height of Block Work (m):</label>
        <input type="number" id="blockHeight" placeholder="e.g. 0.6" required>
    
        <label for="blockHours">Estimated Working Hours:</label>
        <input type="number" id="blockHours" placeholder="e.g. 8">
    
        <button onclick="calculateBlockworkFoundation()">Calculate</button>
      `;
      break;

    case "blockwork_wall":
      formHTML = `
        <h3>Block Work (Wall)</h3>
        <p><strong>Description:</strong> Construction of walls above foundation level using concrete blocks.</p>
        <p><strong>Purpose:</strong> Forms the main walls of the building for structural integrity and enclosure.</p>
        <p><strong>Note:</strong> Ensure proper alignment and plumb, with control of block joints.</p>

        <label for="wallLength">Total Wall Length (m):</label>
        <input type="number" id="wallLength" placeholder="e.g. 45" required>

        <label for="wallHeight">Wall Height (m):</label>
        <input type="number" id="wallHeight" placeholder="e.g. 3" required>

        <label for="wallHours">Estimated Working Hours:</label>
        <input type="number" id="wallHours" placeholder="e.g. 12">

        <button onclick="calculateBlockworkWall()">Calculate</button>
      `;
      break;
    
    case "lintel":
      formHTML = `
        <h3>Lintel Installation</h3>
        <p><strong>Description:</strong> Installation of reinforced concrete lintels above door and window openings.</p>
        <p><strong>Purpose:</strong> Distributes loads around openings and prevents cracking or failure of the wall.</p>
        <p><strong>Note:</strong> Ensure lintels are well-supported during curing and follow proper reinforcement spacing.</p>

        <label for="lintelLength">Total Lintel Length (m):</label>
        <input type="number" id="lintelLength" placeholder="e.g. 12" required>

        <label for="lintelWidth">Lintel Width (m):</label>
        <input type="number" id="lintelWidth" placeholder="e.g. 0.225" required>

        <label for="lintelDepth">Lintel Depth (m):</label>
        <input type="number" id="lintelDepth" placeholder="e.g. 0.15" required>

        <label for="lintelHours">Estimated Working Hours:</label>
        <input type="number" id="lintelHours" placeholder="e.g. 6">

        <button onclick="calculateLintel()">Calculate</button>
      `;
      break;
  
    
  case "roof_trusses":
    formHTML = `
      <h3>Roof Trusses / Framing</h3>
      <p><strong>Description:</strong> Installation of timber or steel structural framework to support the roof covering.</p>
      <p><strong>Purpose:</strong> Transfers the load of the roof to the walls and ensures structural integrity.</p>
      <p><strong>Note:</strong> All trusses must be properly treated, aligned, and braced to withstand wind and dead loads.</p>

      <form onsubmit="event.preventDefault(); calculateRoofTrusses()">
        <label for="roofSpan">Total Span Length (m):</label>
        <input type="number" id="roofSpan" placeholder="e.g. 20" min="0" required>

        <label for="roofPitch">Roof Pitch Angle (°):</label>
        <input type="number" id="roofPitch" placeholder="e.g. 30" min="0" required>

        <label for="roofHours">Estimated Working Hours:</label>
        <input type="number" id="roofHours" placeholder="e.g. 12" min="0">

        <button type="submit">Calculate</button>
      </form>
    `;
    break;

  case "roof_covering":
    formHTML = `
      <h3>Roof Covering</h3>
      <p><strong>Description:</strong> Installation of roofing sheets such as aluminum, shingles, tiles, or other types over trusses.</p>
      <p><strong>Purpose:</strong> To protect the building from weather conditions and complete the roofing system.</p>
      <p><strong>Note:</strong> Ensure proper overlap, alignment, and fastening for durability and waterproofing.</p>

      <form onsubmit="event.preventDefault(); calculateRoofCovering()">
        <label for="roofArea">Roof Surface Area (m²):</label>
        <input type="number" id="roofArea" placeholder="e.g. 120" min="0" required>

        <label for="roofCoverHours">Estimated Working Hours:</label>
        <input type="number" id="roofCoverHours" placeholder="e.g. 10" min="0">

        <button type="submit">Calculate</button>
      </form>
    `;
    break;

  case "gutters":
    formHTML = `
      <h3>Gutters and Downpipes</h3>
      <p><strong>Description:</strong> Installation of gutters and downpipes to collect and direct rainwater from the roof.</p>
      <p><strong>Purpose:</strong> Prevent water damage by directing rainwater away from the building’s foundation and walls.</p>
      <p><strong>Note:</strong> Ensure slope and positioning are correct for optimal water flow and avoid clogging.</p>

      <form onsubmit="event.preventDefault(); calculateGutters()">
        <label for="gutterLength">Total Gutter Length (m):</label>
        <input type="number" id="gutterLength" placeholder="e.g. 40" min="0" required>

        <label for="gutterHours">Estimated Working Hours:</label>
        <input type="number" id="gutterHours" placeholder="e.g. 6" min="0">

        <button type="submit">Calculate</button>
      </form>
    `;
    break;

  case "wall_plastering":
    formHTML = `
      <h3>Wall Plastering</h3>
      <p><strong>Description:</strong> Application of cement-sand plaster on wall surfaces to provide a smooth finish.</p>
      <p><strong>Purpose:</strong> To protect walls and prepare surfaces for final finishes such as paint or tiles.</p>
      <p><strong>Note:</strong> Proper curing and surface preparation are essential for durability.</p>

      <form onsubmit="event.preventDefault(); calculateWallPlastering()">
        <label for="plasterArea">Wall Area to Plaster (m²):</label>
        <input type="number" id="plasterArea" placeholder="e.g. 100" min="0" required>

        <label for="plasterHours">Estimated Working Hours:</label>
        <input type="number" id="plasterHours" placeholder="e.g. 10" min="0">

        <button type="submit">Calculate</button>
      </form>
    `;
    break;

  case "floor_screeding":
    formHTML = `
      <h3>Floor Screeding</h3>
      <p><strong>Description:</strong> Laying a cement-sand screed to form a smooth, level surface before applying floor finishes.</p>
      <p><strong>Purpose:</strong> To create a flat, solid surface suitable for tile, carpet, or other finishings.</p>
      <p><strong>Note:</strong> Ensure adequate curing time for screed to prevent cracking.</p>

      <form onsubmit="event.preventDefault(); calculateFloorScreeding()">
        <label for="screedArea">Floor Area to Screed (m²):</label>
        <input type="number" id="screedArea" placeholder="e.g. 75" min="0" required>

        <label for="screedHours">Estimated Working Hours:</label>
        <input type="number" id="screedHours" placeholder="e.g. 8" min="0">

        <button type="submit">Calculate</button>
      </form>
    `;
    break;

  case 'interior_finishes':
    formHTML = `
      <h3>Interior Finishes</h3>
      <p>Apply surface finishes such as plaster, paint, tiles, or ceiling panels to improve aesthetics and functionality of internal spaces.</p>
      <p><strong>Purpose:</strong> Enhance the look, durability, and usability of indoor areas.</p>
      <p><strong>Note:</strong> Ensure surfaces are properly prepared before applying finishes. Choose quality materials to match room function and client expectations.</p>

      <form id="interior-finishes-form" onsubmit="calculateInteriorFinishes(event)">
        <label for="finish-type">Type of Finish:</label>
        <select id="finish-type" required>
          <option value="plastering">Plastering</option>
          <option value="tiling">Tiling</option>
          <option value="ceiling">Ceiling</option>
          <option value="combined">Combined Finish</option>
        </select>

        <label for="rooms">Number of Rooms:</label>
        <input type="number" id="rooms" min="0" required>

        <label for="hours">Estimated working hours:</label>
        <input type="number" id="hours" min="0" required>

        <label for="crew">Crew size (optional):</label>
        <input type="number" id="crew" placeholder="Default: 3" min="1">

        <button type="submit">Calculate</button>
      </form>
    `;
    break;

  case 'painting':
    formHTML = `
      <h3>Painting</h3>
      <p>Apply paint to internal and external surfaces for protection, decoration, and aesthetics.</p>
      <p><strong>Purpose:</strong> Protect surfaces from weather and wear while enhancing appearance.</p>
      <p><strong>Note:</strong> Proper surface preparation and the use of quality paint ensure durability.</p>

      <form id="painting-form" onsubmit="calculatePainting(event)">
        <label for="surface-area">Surface Area (in m²):</label>
        <input type="number" id="surface-area" min="0" required>

        <label for="coats">Number of Coats:</label>
        <input type="number" id="coats" value="2" min="1" required>

        <label for="hours">Estimated working hours:</label>
        <input type="number" id="hours" min="0" required>

        <label for="crew">Crew size (optional):</label>
        <input type="number" id="crew" placeholder="Default: 2" min="1">

        <button type="submit">Calculate</button>
      </form>
    `;
    break;
    

    default:
      formHTML = "<p>No form available for this method.</p>";
      break;
  }

  // Inject the form into the #formArea div
  document.getElementById("formArea").innerHTML = formHTML;
}







function calculateEstimate(method) {
  const workers = document.getElementById('workers').value; // Get the number of workers
  const hours = document.getElementById('hours').value; // Get the working hours
  const equipmentCost = document.getElementById('equipment').value; // Get the equipment cost
  const materialsCost = document.getElementById('materials').value; // Get the material cost

  const laborRate = 50; // Example labor rate per worker per hour (₵50/hour)

  // Calculate labor cost: laborRate * workers * hours
  const laborCost = workers * hours * laborRate; 

  // Calculate total cost (labor + equipment + materials)
  const totalCost = laborCost + parseFloat(equipmentCost) + parseFloat(materialsCost);

  let resultHTML = `<h4>Estimation Result for Site Setup</h4>
                    <p><strong>Labor Cost:</strong> ₵${laborCost}</p>
                    <p><strong>Equipment Cost:</strong> ₵${equipmentCost}</p>
                    <p><strong>Material Cost:</strong> ₵${materialsCost}</p>
                    <p><strong>Total Cost:</strong> ₵${totalCost}</p>`;

  // Display result in the result div
  document.getElementById('result').innerHTML = resultHTML;
}

function calculateSettingOut(e) {
  e.preventDefault(); // Prevent form from submitting normally

  const hours = parseFloat(document.getElementById('workingHours').value);  // Get working hours from input
  const crew = parseInt(document.getElementById('crewSize').value);  // Get crew size from input
  const laborRate = 2500;  // Set the labor rate per hour (₦2500 or adjust to your currency)

  const laborCost = hours * crew * laborRate;  // Calculate the labor cost

  // Inject result into the result div
  document.getElementById('result').innerHTML = `
    <h4>Setting Out Estimate</h4>
    <p><strong>Working Hours:</strong> ${hours} hrs</p>
    <p><strong>Crew Size:</strong> ${crew}</p>
    <p><strong>Labor Cost (@₦${laborRate}/hr):</strong> ₦${laborCost.toLocaleString()}</p>
  `;

  // Optionally add to the summary
  addToSummary('Setting Out', 'N/A', laborCost);  // This is a helper function for the summary table
}

function addToSummary(method, quantity, cost) {
  const table = document.getElementById("summary-details");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${method}</td>
    <td>${quantity}</td>
    <td>₦${cost.toLocaleString()}</td>
  `;
  table.appendChild(row);

  updateTotalSummary(cost);
}

function updateTotalSummary(cost) {
  const costElem = document.getElementById("total-cost");
  const quantityElem = document.getElementById("total-quantity");

  let currentTotal = parseFloat(costElem.textContent.replace(/[^0-9.-]+/g, "")) || 0;
  let newTotal = currentTotal + cost;

  costElem.textContent = `₦${newTotal.toLocaleString()}`;
  quantityElem.textContent = "Manual Entry";
}





function calculateSiteClearance(event) {
  event.preventDefault();

  const area = parseFloat(document.getElementById("area").value);
  const hours = parseFloat(document.getElementById("hours").value);
  const crewSize = parseInt(document.getElementById("crew").value) || 3;

  // Internal rates
  const laborRatePerHour = 25; // per worker per hour in GHS
  const toolCostPerM2 = 0.5;   // simple tools, herbicide etc.
  const equipmentFlatRate = 50; // shared equipment use

  // Calculations
  const laborCost = crewSize * laborRatePerHour * hours;
  const materialCost = area * toolCostPerM2;
  const equipmentCost = equipmentFlatRate;
  const totalCost = laborCost + materialCost + equipmentCost;

  // Display result
  const resultHTML = `
    <h4>Site Clearance Estimate</h4>
    <p><strong>Labor Cost:</strong> ₵${laborCost.toFixed(2)}</p>
    <p><strong>Tool/Material Cost:</strong> ₵${materialCost.toFixed(2)}</p>
    <p><strong>Equipment Cost:</strong> ₵${equipmentCost.toFixed(2)}</p>
    <hr>
    <p><strong>Total Cost:</strong> ₵${totalCost.toFixed(2)}</p>
  `;

  document.getElementById("result").innerHTML = resultHTML;

  // Save summary for the modal
  addToSummary("Site Clearance", `${area} m²`, totalCost.toFixed(2));
}

function calculateTopsoilExcavation() {
  const area = parseFloat(document.getElementById("area").value);
  const depth = parseFloat(document.getElementById("depth").value);
  const workHours = parseFloat(document.getElementById("workHours").value);

  if (isNaN(area) || isNaN(depth)) {
    alert("Please enter valid area and depth values.");
    return;
  }

  const volume = (area * (depth / 1000)).toFixed(2); // m³
  const materialRate = 4500; // per m³, adjust as needed
  const laborRatePerHour = 2000;

  const materialCost = volume * materialRate;
  const laborCost = workHours ? workHours * laborRatePerHour : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Topsoil Excavation:</h4>
    <p><strong>Volume Excavated:</strong> ${volume} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateTrenchExcavation() {
  const length = parseFloat(document.getElementById("trenchLength").value);
  const width = parseFloat(document.getElementById("trenchWidth").value);
  const depth = parseFloat(document.getElementById("trenchDepth").value);
  const workHours = parseFloat(document.getElementById("trenchHours").value);

  if (isNaN(length) || isNaN(width) || isNaN(depth)) {
    alert("Please enter valid trench dimensions.");
    return;
  }

  const volume = (length * width * depth).toFixed(2); // m³
  const materialRate = 5000; // per m³
  const laborRatePerHour = 2000;

  const materialCost = volume * materialRate;
  const laborCost = workHours ? workHours * laborRatePerHour : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Trench Excavation:</h4>
    <p><strong>Volume Excavated:</strong> ${volume} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optional: addToSummary({ method: "Trench Excavation", quantity: volume, unit: "m³", materialCost, laborCost });
}

function calculatePitExcavation() {
  const count = parseFloat(document.getElementById("pitCount").value);
  const length = parseFloat(document.getElementById("pitLength").value);
  const width = parseFloat(document.getElementById("pitWidth").value);
  const depth = parseFloat(document.getElementById("pitDepth").value);
  const hours = parseFloat(document.getElementById("pitHours").value);

  if (isNaN(count) || isNaN(length) || isNaN(width) || isNaN(depth)) {
    alert("Please enter all pit dimensions.");
    return;
  }

  const volume = count * length * width * depth;
  const materialRate = 5500; // per m³
  const laborRate = 2000;

  const materialCost = volume * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Pit Excavation:</h4>
    <p><strong>Total Volume:</strong> ${volume.toFixed(2)} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optional: addToSummary({ method: "Pit Excavation", quantity: volume, unit: "m³", materialCost, laborCost });
}

function calculateHardcoreFilling() {
  const length = parseFloat(document.getElementById("hardcoreLength").value);
  const width = parseFloat(document.getElementById("hardcoreWidth").value);
  const depth = parseFloat(document.getElementById("hardcoreDepth").value);
  const hours = parseFloat(document.getElementById("hardcoreHours").value);

  if (isNaN(length) || isNaN(width) || isNaN(depth)) {
    alert("Please fill in all dimensions.");
    return;
  }

  const volume = length * width * depth;
  const materialRate = 6000; // per m³
  const laborRate = 2000;

  const materialCost = volume * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Hardcore Filling:</h4>
    <p><strong>Volume:</strong> ${volume.toFixed(2)} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optional: addToSummary({ method: "Hardcore Filling", quantity: volume, unit: "m³", materialCost, laborCost });
}

function calculateBlindingConcrete(event) {
  event.preventDefault();

  const area = parseFloat(document.getElementById('blinding-area').value);
  const hours = parseFloat(document.getElementById('blinding-hours').value);
  const crew = parseInt(document.getElementById('blinding-crew').value) || 4;

  const thickness = 0.05; // 50mm thick
  const volume = area * thickness; // in cubic meters
  const unitRate = 130; // e.g. GHC per m³ for lean mix concrete

  const materialCost = volume * unitRate;
  const laborRate = 25; // GHC per hour per person
  const laborCost = hours * crew * laborRate;
  const total = materialCost + laborCost;

  addToSummary("Blinding Concrete", {
    Area: `${area} m²`,
    Volume: `${volume.toFixed(2)} m³`,
    "Material Cost": `GHC ${materialCost.toFixed(2)}`,
    "Labor Cost": `GHC ${laborCost.toFixed(2)}`,
    Total: `GHC ${total.toFixed(2)}`
  });
}

function calculateFoundationConcrete() {
  const length = parseFloat(document.getElementById("fcLength").value);
  const width = parseFloat(document.getElementById("fcWidth").value);
  const depth = parseFloat(document.getElementById("fcDepth").value);
  const hours = parseFloat(document.getElementById("fcHours").value);

  if (isNaN(length) || isNaN(width) || isNaN(depth)) {
    alert("Please fill in all dimensions.");
    return;
  }

  const volume = length * width * depth;
  const materialRate = 25000; // ₦ per m³
  const laborRate = 3000;

  const materialCost = volume * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Foundation Concrete:</h4>
    <p><strong>Volume:</strong> ${volume.toFixed(2)} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optional: addToSummary({ method: "Foundation Concrete", quantity: volume, unit: "m³", materialCost, laborCost });
}

function calculateColumnConcrete() {
  const height = parseFloat(document.getElementById("ccHeight").value);
  const width = parseFloat(document.getElementById("ccWidth").value);
  const depth = parseFloat(document.getElementById("ccDepth").value);
  const count = parseInt(document.getElementById("ccNumber").value);
  const hours = parseFloat(document.getElementById("ccHours").value);

  if (isNaN(height) || isNaN(width) || isNaN(depth) || isNaN(count)) {
    alert("Please complete all required fields.");
    return;
  }

  const volume = height * width * depth * count;
  const materialRate = 27000; // ₦ per m³
  const laborRate = 3200;

  const materialCost = volume * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Column Concrete:</h4>
    <p><strong>Total Volume:</strong> ${volume.toFixed(2)} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optional: addToSummary({ method: "Column Concrete", quantity: volume, unit: "m³", materialCost, laborCost });
}

function calculateGroundFloorSlab() {
  const length = parseFloat(document.getElementById("gfsLength").value);
  const width = parseFloat(document.getElementById("gfsWidth").value);
  const thickness = parseFloat(document.getElementById("gfsThickness").value);
  const hours = parseFloat(document.getElementById("gfsHours").value);

  if (isNaN(length) || isNaN(width) || isNaN(thickness)) {
    alert("Please complete all required fields.");
    return;
  }

  const volume = length * width * thickness;
  const materialRate = 25000; // ₦ per m³
  const laborRate = 3200;

  const materialCost = volume * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Ground Floor Slab:</h4>
    <p><strong>Total Volume:</strong> ${volume.toFixed(2)} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optional: addToSummary({ method: "Ground Floor Slab", quantity: volume, unit: "m³", materialCost, laborCost });
}

function calculateUpperFloorSlab() {
  const length = parseFloat(document.getElementById("ufsLength").value);
  const width = parseFloat(document.getElementById("ufsWidth").value);
  const thickness = parseFloat(document.getElementById("ufsThickness").value);
  const hours = parseFloat(document.getElementById("ufsHours").value);

  if (isNaN(length) || isNaN(width) || isNaN(thickness)) {
    alert("Please complete all required fields.");
    return;
  }

  const volume = length * width * thickness;
  const materialRate = 27000; // ₦ per m³ (slightly higher for suspended slab)
  const laborRate = 3400;

  const materialCost = volume * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Upper Floor Slab:</h4>
    <p><strong>Total Volume:</strong> ${volume.toFixed(2)} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optionally: addToSummary({ method: "Upper Floor Slab", quantity: volume, unit: "m³", materialCost, laborCost });
}

function calculateSteelCuttingBending() {
  const steelKg = parseFloat(document.getElementById("scbKg").value);
  const hours = parseFloat(document.getElementById("scbHours").value);

  if (isNaN(steelKg)) {
    alert("Please enter the total steel required.");
    return;
  }

  const materialRate = 850; // ₦ per kg of rebar
  const laborRate = 2800;

  const materialCost = steelKg * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Steel Cutting & Bending:</h4>
    <p><strong>Total Steel:</strong> ${steelKg.toFixed(1)} kg</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;

  // Optionally: addToSummary({ method: "Steel Cutting & Bending", quantity: steelKg, unit: "kg", materialCost, laborCost });
}

function calculateIronRodApplication() {
  const ironKg = parseFloat(document.getElementById("iraKg").value);
  const hours = parseFloat(document.getElementById("iraHours").value);

  if (isNaN(ironKg)) {
    alert("Please enter the weight of iron rods.");
    return;
  }

  const materialRate = 830; // ₦ per kg (adjust as needed)
  const laborRate = 2700;

  const materialCost = ironKg * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Iron Rod Application:</h4>
    <p><strong>Iron Rods Used:</strong> ${ironKg.toFixed(1)} kg</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculatePillarReinforcement() {
  const count = parseFloat(document.getElementById("pillarCount").value);
  const steelPer = parseFloat(document.getElementById("steelPerPillar").value);
  const hours = parseFloat(document.getElementById("pillarHours").value);

  if (isNaN(count) || isNaN(steelPer)) {
    alert("Please enter the number of pillars and steel quantity per pillar.");
    return;
  }

  const totalSteel = count * steelPer;
  const materialRate = 830; // ₦ per kg
  const laborRate = 2700;

  const materialCost = totalSteel * materialRate;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Pillar Reinforcement:</h4>
    <p><strong>Total Steel Used:</strong> ${totalSteel.toFixed(1)} kg</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateDPM() {
  const area = parseFloat(document.getElementById("dpmArea").value);
  const hours = parseFloat(document.getElementById("dpmHours").value);

  if (isNaN(area)) {
    alert("Please enter the area to cover.");
    return;
  }

  const membraneRatePerM2 = 400; // ₦ per m²
  const laborRate = 2500; // per hour

  const materialCost = area * membraneRatePerM2;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Damp Proof Membrane:</h4>
    <p><strong>Total Area:</strong> ${area.toFixed(1)} m²</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateBlockworkFoundation() {
  const length = parseFloat(document.getElementById("blockLength").value);
  const height = parseFloat(document.getElementById("blockHeight").value);
  const hours = parseFloat(document.getElementById("blockHours").value);

  if (isNaN(length) || isNaN(height)) {
    alert("Please enter both wall length and height.");
    return;
  }

  const wallArea = length * height; // in m²
  const blocksPerM2 = 10; // standard 6" block usage
  const blockCost = 350; // per block
  const laborRate = 2500; // per hour

  const totalBlocks = wallArea * blocksPerM2;
  const materialCost = totalBlocks * blockCost;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Block Work (Foundation):</h4>
    <p><strong>Total Wall Area:</strong> ${wallArea.toFixed(2)} m²</p>
    <p><strong>Total Blocks Needed:</strong> ${Math.ceil(totalBlocks)} blocks</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateBlockworkWall() {
  const length = parseFloat(document.getElementById("wallLength").value);
  const height = parseFloat(document.getElementById("wallHeight").value);
  const hours = parseFloat(document.getElementById("wallHours").value);

  if (isNaN(length) || isNaN(height)) {
    alert("Please enter valid length and height.");
    return;
  }

  const wallArea = length * height;
  const blocksPerM2 = 10;
  const blockCost = 350;
  const laborRate = 2500;

  const totalBlocks = wallArea * blocksPerM2;
  const materialCost = totalBlocks * blockCost;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Block Work (Wall):</h4>
    <p><strong>Total Wall Area:</strong> ${wallArea.toFixed(2)} m²</p>
    <p><strong>Total Blocks Needed:</strong> ${Math.ceil(totalBlocks)} blocks</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateLintel() {
  const length = parseFloat(document.getElementById("lintelLength").value);
  const width = parseFloat(document.getElementById("lintelWidth").value);
  const depth = parseFloat(document.getElementById("lintelDepth").value);
  const hours = parseFloat(document.getElementById("lintelHours").value);

  if (isNaN(length) || isNaN(width) || isNaN(depth)) {
    alert("Please fill all lintel dimensions.");
    return;
  }

  const volume = length * width * depth;
  const concreteCostPerM3 = 55000;
  const laborRate = 3000;

  const materialCost = volume * concreteCostPerM3;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Lintel Installation:</h4>
    <p><strong>Total Lintel Volume:</strong> ${volume.toFixed(3)} m³</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateRoofTrusses() {
  const span = parseFloat(document.getElementById("roofSpan").value);
  const pitch = parseFloat(document.getElementById("roofPitch").value);
  const hours = parseFloat(document.getElementById("roofHours").value);

  if (isNaN(span) || isNaN(pitch)) {
    alert("Please enter span length and pitch angle.");
    return;
  }

  const trussCount = Math.ceil(span / 0.6); // approx truss spacing every 0.6m
  const materialCostPerTruss = 8500; // estimated average per truss (treated timber + fasteners)
  const laborRate = 3500;

  const materialCost = trussCount * materialCostPerTruss;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Roof Trusses / Framing:</h4>
    <p><strong>Total Trusses Needed:</strong> ${trussCount}</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateRoofCovering() {
  const area = parseFloat(document.getElementById("roofArea").value);
  const hours = parseFloat(document.getElementById("roofCoverHours").value);

  if (isNaN(area)) {
    alert("Please enter the roof area.");
    return;
  }

  const sheetCostPerSqM = 3500; // avg cost for aluminum roofing sheet per m²
  const laborRate = 3000;

  const materialCost = area * sheetCostPerSqM;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Roof Covering:</h4>
    <p><strong>Total Area:</strong> ${area} m²</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateGutters() {
  const length = parseFloat(document.getElementById("gutterLength").value);
  const hours = parseFloat(document.getElementById("gutterHours").value);

  if (isNaN(length)) {
    alert("Please enter the total gutter length.");
    return;
  }

  const materialCostPerM = 1200; // cost per meter of gutter + downpipe
  const laborRate = 2500;

  const materialCost = length * materialCostPerM;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Gutters and Downpipes:</h4>
    <p><strong>Total Length:</strong> ${length} m</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateWallPlastering() {
  const area = parseFloat(document.getElementById("plasterArea").value);
  const hours = parseFloat(document.getElementById("plasterHours").value);

  if (isNaN(area)) {
    alert("Please enter the plastering area.");
    return;
  }

  const materialCostPerSqM = 850; // cement, sand, additives
  const laborRate = 2000;

  const materialCost = area * materialCostPerSqM;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Wall Plastering:</h4>
    <p><strong>Total Area:</strong> ${area} m²</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateFloorScreeding() {
  const area = parseFloat(document.getElementById("screedArea").value);
  const hours = parseFloat(document.getElementById("screedHours").value);

  if (isNaN(area)) {
    alert("Please enter the floor screeding area.");
    return;
  }

  const materialCostPerSqM = 900; // cement, sand
  const laborRate = 2000;

  const materialCost = area * materialCostPerSqM;
  const laborCost = hours ? hours * laborRate : 0;
  const totalCost = materialCost + laborCost;

  document.getElementById("result").innerHTML = `
    <h4>Results for Floor Screeding:</h4>
    <p><strong>Total Area:</strong> ${area} m²</p>
    <p><strong>Material Cost:</strong> ₦${materialCost.toLocaleString()}</p>
    <p><strong>Labor Cost:</strong> ₦${laborCost.toLocaleString()}</p>
    <p><strong>Total Cost:</strong> ₦${totalCost.toLocaleString()}</p>
  `;
}

function calculateInteriorFinishes(event) {
  event.preventDefault();

  const type = document.getElementById('finish-type').value;
  const rooms = parseInt(document.getElementById('rooms').value);
  const hours = parseFloat(document.getElementById('hours').value);
  const crew = parseInt(document.getElementById('crew').value) || 3;

  // Base costs per room for different finishes
  const rates = {
    plastering: 400,
    tiling: 600,
    ceiling: 500,
    combined: 1300
  };

  const unitCost = rates[type] || 0;
  const materialCost = rooms * unitCost;
  const laborRate = 25;
  const laborCost = hours * crew * laborRate;
  const total = materialCost + laborCost;

  addToSummary("Interior Finishes", {
    "Finish Type": type.charAt(0).toUpperCase() + type.slice(1),
    "Rooms": rooms,
    "Material Cost": `GHC ${materialCost.toFixed(2)}`,
    "Labor Cost": `GHC ${laborCost.toFixed(2)}`,
    "Total Cost": `GHC ${total.toFixed(2)}`
  });
}


function calculatePainting(event) {
  event.preventDefault();

  const area = parseFloat(document.getElementById('surface-area').value);
  const coats = parseInt(document.getElementById('coats').value);
  const hours = parseFloat(document.getElementById('hours').value);
  const crew = parseInt(document.getElementById('crew').value) || 2;

  const paintCostPerSqmPerCoat = 6; // GHC
  const materialCost = area * coats * paintCostPerSqmPerCoat;

  const laborRate = 20; // GHC per hour per person
  const laborCost = hours * crew * laborRate;

  const total = materialCost + laborCost;

  addToSummary("Painting", {
    "Surface Area": `${area} m²`,
    "Coats": coats,
    "Material Cost": `GHC ${materialCost.toFixed(2)}`,
    "Labor Cost": `GHC ${laborCost.toFixed(2)}`,
    "Total Cost": `GHC ${total.toFixed(2)}`
  });
}

function addToSummary(method, materialQuantity, totalCost) {
  const summaryDetails = document.getElementById("summary-details");

  // Create a new row
  const row = document.createElement("tr");

  // Create and append the cells for Method, Material Quantity, and Cost
  const methodCell = document.createElement("td");
  methodCell.innerText = method;
  row.appendChild(methodCell);

  const quantityCell = document.createElement("td");
  quantityCell.innerText = materialQuantity;
  row.appendChild(quantityCell);

  const costCell = document.createElement("td");
  costCell.innerText = "₵" + totalCost.toFixed(2);
  row.appendChild(costCell);

  // Append the row to the summary table
  summaryDetails.appendChild(row);

  // Update the totals
  updateTotals();
}

let totalQuantity = 0;
let totalCost = 0;

function updateTotals() {
    const totalQuantityElem = document.getElementById("total-quantity");
    const totalCostElem = document.getElementById("total-cost");

    // Reset totals
    totalQuantity = 0;
    totalCost = 0;

    // Loop through each row in the summary table and sum the values
    const rows = document.getElementById("summary-details").children;
    for (let i = 0; i < rows.length; i++) {
        const quantity = parseFloat(rows[i].children[1].innerText);
        const cost = parseFloat(rows[i].children[2].innerText.replace("₵", ""));
        
        totalQuantity += quantity;
        totalCost += cost;
    }

    // Display the updated totals
    totalQuantityElem.innerText = totalQuantity.toFixed(2);
    totalCostElem.innerText = "₵" + totalCost.toFixed(2);
}


function toggleCategory(header) {
  const methodList = header.nextElementSibling;
  methodList.style.display = methodList.style.display === "block" ? "none" : "block";
}

document.getElementById('submit-review').addEventListener('click', function () {
  // Simulated star rating - you can improve this later with actual star logic
  const rating = 5; // Assume full rating for now

  // Get the location input
  const location = document.getElementById('location').value.trim();

  // Log or store the review (customize this to save in your DB or localStorage)
  const review = {
      rating: rating,
      location: location || 'Not provided',
      date: new Date().toLocaleDateString()
  };

  console.log("Review submitted:", review);

  // Optionally store in localStorage
  let reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
  reviews.push(review);
  localStorage.setItem('reviews', JSON.stringify(reviews));

  // Close modal (or show thank you)
  document.getElementById('review-modal').style.display = 'none';
  alert("Thanks for your feedback!");
});
































