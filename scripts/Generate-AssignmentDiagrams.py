from pathlib import Path
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "assignment" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

FONT = "Arial"
INK = "#1F2937"
MUTED = "#4B5563"
WARM = "#FCE8D5"
WARM_STROKE = "#C58B42"
GROUP_FILL = "#FFF9F2"
GROUP_STROKE = "#D7B17B"
LIGHT = "#F9FAFB"
GRAY = "#6B7280"

TEXT = (
    "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;"
    "whiteSpace=wrap;rounded=0;fontFamily=Arial;fontColor=#1F2937;"
)
BOX = (
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#374151;"
    "strokeWidth=2;fontFamily=Arial;fontColor=#1F2937;align=center;verticalAlign=middle;"
)
SOFTWARE_SYSTEM = (
    BOX + "fillColor=#FCE8D5;strokeColor=#C58B42;strokeWidth=2;"
)
EXTERNAL = (
    BOX + "dashed=1;dashPattern=8 6;strokeColor=#6B7280;"
)
BOUNDARY = (
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#FCE8D5;fillOpacity=62;"
    "strokeColor=#C58B42;strokeWidth=2;"
)
GROUP = (
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFF9F2;fillOpacity=55;"
    "strokeColor=#D7B17B;strokeWidth=1;dashed=1;dashPattern=6 5;"
)
GRAY_GROUP = (
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#F9FAFB;fillOpacity=75;"
    "strokeColor=#9CA3AF;strokeWidth=1;dashed=1;dashPattern=6 5;"
)
ACTOR = (
    "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;"
    "strokeColor=#1F2937;fillColor=#FFFFFF;fontFamily=Arial;fontColor=#1F2937;"
    "fontSize=16;"
)
DB = (
    "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;"
    "fillColor=#FFFFFF;strokeColor=#374151;strokeWidth=2;fontFamily=Arial;"
    "fontColor=#1F2937;align=center;verticalAlign=middle;"
)
QUEUE = (
    BOX + "shape=process;size=0.08;"
)
EDGE = (
    "edgeStyle=orthogonalEdgeStyle;rounded=0;curved=0;orthogonalLoop=1;"
    "jettySize=auto;html=1;endArrow=block;endFill=1;endSize=12;"
    "strokeColor=#374151;strokeWidth=2;"
)
ASYNC = EDGE + "dashed=1;dashPattern=7 5;"
OPTIONAL = ASYNC + "strokeColor=#6B7280;"

class Diagram:
    def __init__(self, name, width, height):
        self.mxfile = ET.Element("mxfile", {
            "host": "app.diagrams.net",
            "modified": datetime.now(timezone.utc).isoformat(),
            "agent": "LongevityDiet Assignment Diagram Generator v3",
            "version": "24.7.17",
            "type": "device",
        })
        self.diagram = ET.SubElement(
            self.mxfile, "diagram",
            {"id": name.replace(" ", "-"), "name": "Page-1"}
        )
        self.model = ET.SubElement(self.diagram, "mxGraphModel", {
            "dx": "1422", "dy": "794", "grid": "1", "gridSize": "10",
            "guides": "1", "tooltips": "1", "connect": "1", "arrows": "1",
            "fold": "1", "page": "1", "pageScale": "1",
            "pageWidth": str(width), "pageHeight": str(height),
            "math": "0", "shadow": "0",
        })
        self.root = ET.SubElement(self.model, "root")
        ET.SubElement(self.root, "mxCell", {"id": "0"})
        ET.SubElement(self.root, "mxCell", {"id": "1", "parent": "0"})
        self.n = 2

    def _id(self, prefix="c"):
        value = f"{prefix}{self.n}"
        self.n += 1
        return value

    def vertex(self, value, x, y, w, h, style, parent="1", cid=None):
        cid = cid or self._id()
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cid, "value": value, "style": style,
            "vertex": "1", "parent": parent,
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x), "y": str(y), "width": str(w), "height": str(h),
            "as": "geometry",
        })
        return cid

    def text(self, value, x, y, w, h, size=14, bold=False, align="left",
             color=INK):
        style = TEXT + f"fontSize={size};align={align};fontColor={color};"
        if bold:
            style += "fontStyle=1;"
        return self.vertex(value, x, y, w, h, style)

    def edge(self, source, target, style=EDGE, points=None, exit=None, entry=None):
        cid = self._id("e")
        edge_style = style
        if exit:
            edge_style += (
                f"exitX={exit[0]};exitY={exit[1]};exitDx=0;exitDy=0;"
            )
        if entry:
            edge_style += (
                f"entryX={entry[0]};entryY={entry[1]};entryDx=0;entryDy=0;"
            )
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cid, "style": edge_style, "edge": "1", "parent": "1",
            "source": source, "target": target,
        })
        geom = ET.SubElement(cell, "mxGeometry", {
            "relative": "1", "as": "geometry",
        })
        if points:
            arr = ET.SubElement(geom, "Array", {"as": "points"})
            for x, y in points:
                ET.SubElement(arr, "mxPoint", {"x": str(x), "y": str(y)})
        return cid

    def save(self, filename):
        ET.indent(self.mxfile, space="  ")
        target = OUT / filename
        ET.ElementTree(self.mxfile).write(
            target, encoding="utf-8", xml_declaration=True
        )

        mirror_map = {
            "01-c0-system-context.drawio": ROOT / "docs" / "architecture" / "01-system-context.drawio",
            "02-c1-container-architecture.drawio": ROOT / "docs" / "architecture" / "02-container-architecture.drawio",
        }
        mirror = mirror_map.get(filename)
        if mirror:
            mirror.parent.mkdir(parents=True, exist_ok=True)
            mirror.write_bytes(target.read_bytes())

def page_title(d, main, sub, width=2200):
    d.text(main, 70, 35, width, 55, size=28, bold=True)
    d.text(sub, 70, 93, width, 40, size=14, color=MUTED)

def group_title(d, title, x, y, w=500):
    d.text(f"<b>{title}</b>", x, y, w, 40, size=18)

def actor_value(name):
    return f"<b>{name}</b><br><font style='font-size:13px'>[Person]</font>"

def c4_box(name, element_type, technology, description, font=18):
    return (
        f"<b>{name}</b><br>"
        f"<font style='font-size:14px'>[{element_type}]</font><br>"
        f"<font style='font-size:14px'>{technology}</font><br><br>"
        f"<font style='font-size:15px'>{description}</font>"
    )



def compact_c4_box(name, element_type, technology, responsibility):
    tech_line = f"<br><font style='font-size:14px'>{technology}</font>" if technology else ""
    return (
        f"<b>{name}</b><br>"
        f"<font style='font-size:13px'>[{element_type}]</font>"
        f"{tech_line}<br>"
        f"<font style='font-size:13px'>{responsibility}</font>"
    )

def concept_box(d, name, description, x, y, w=330, h=120, ref=False):
    style = EXTERNAL if ref else BOX
    suffix = " [Reference]" if ref else ""
    return d.vertex(
        f"<b>{name}{suffix}</b><br><font style='font-size:14px'>{description}</font>",
        x, y, w, h, style + "fontSize=16;spacing=10;"
    )

def table_box(d, name, lines, x, y, w=430, h=245):
    body = "<br>".join(lines)
    return d.vertex(
        f"<b>{name}</b><br><font style='font-size:14px'>{body}</font>",
        x, y, w, h,
        BOX + "fontSize=16;align=left;verticalAlign=top;"
              "spacingLeft=16;spacingRight=12;spacingTop=14;"
    )



def build_c0():
    d = Diagram("C0-System-Context", 2100, 1080)
    page_title(
        d,
        "C0 - C4 System Context - Longevity Diet Companion",
        "People, the system, and direct external systems only.",
        1900,
    )

    guest = d.vertex(actor_value("Guest"), 150, 250, 170, 150, ACTOR)
    member = d.vertex(actor_value("Member"), 150, 465, 170, 150, ACTOR)
    admin = d.vertex(actor_value("Administrator"), 150, 680, 170, 150, ACTOR)

    system_style = BOX + "fillColor=#F3F4F6;strokeColor=#1F2937;strokeWidth=3;"
    system = d.vertex(
        compact_c4_box(
            "Longevity Diet Companion",
            "Software System",
            "",
            "Plan / Track / Recommend",
        ),
        760, 240, 650, 600,
        system_style + "fontSize=20;spacing=20;"
    )

    optional_ai = d.vertex(
        compact_c4_box(
            "Local AI Runtime",
            "External Software System / Optional",
            "",
            "Explanation rewrite only",
        ),
        1660, 435, 300, 210,
        EXTERNAL + "fontSize=16;spacing=14;"
    )

    d.edge(guest, system, exit=(1, .5), entry=(0, .142))
    d.edge(member, system, exit=(1, .5), entry=(0, .50))
    d.edge(admin, system, exit=(1, .5), entry=(0, .858))
    d.edge(system, optional_ai, style=OPTIONAL, exit=(1, .50), entry=(0, .50))

    d.text("Browse / Sign in", 390, 280, 250, 30, size=14, align="center")
    d.text("Plan / Track", 390, 495, 250, 30, size=14, align="center")
    d.text("Manage", 390, 710, 250, 30, size=14, align="center")
    d.text("Rewrite explanation", 1450, 495, 200, 30, size=13, align="center")

    d.text(
        "<b>Legend</b>  Person = actor  |  Solid box = system in scope  |  Dashed = optional external dependency",
        420, 970, 1260, 36, size=13, align="center",
    )
    d.save("01-c0-system-context.drawio")


def build_c1():
    d = Diagram("C1-Container", 5000, 2700)
    page_title(
        d,
        "C1 - C4 Container - Longevity Diet Companion (Target Architecture)",
        "Gateway, service-owned databases, explicit ports, and connected event flows.",
        4300,
    )

    boundary_style = (
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;fillOpacity=0;"
        "strokeColor=#9CA3AF;strokeWidth=2;dashed=1;dashPattern=8 6;"
    )
    d.vertex("", 50, 330, 4300, 2200, boundary_style, cid="ldc-boundary")
    d.text("<b>Longevity Diet Companion</b>", 80, 350, 350, 34, size=16)

    guest = d.vertex(actor_value("Guest"), 1125, 120, 150, 145, ACTOR)
    member = d.vertex(actor_value("Member"), 2125, 120, 150, 145, ACTOR)
    admin = d.vertex(actor_value("Administrator"), 3225, 120, 150, 145, ACTOR)

    web = d.vertex(
        compact_c4_box("Web Application", "Container", "React / TypeScript / HTTPS :443", "Browser UI"),
        850, 410, 2900, 135, BOX + "fontSize=17;spacing=10;"
    )
    gateway = d.vertex(
        compact_c4_box("API Gateway", "Container", "YARP / .NET 9 / :8080", "Routing / edge policy"),
        500, 630, 3800, 150, BOX + "fontSize=17;spacing=10;"
    )

    identity_db = d.vertex(compact_c4_box("LongevityIdentityDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 100, 900, 380, 170, DB + "fontSize=15;spacing=8;")
    identity = d.vertex(compact_c4_box("Identity & Profile Service", "Container", "ASP.NET Core / REST :8081", "Auth / profile"), 650, 900, 500, 170, BOX + "fontSize=16;spacing=9;")
    catalog_db = d.vertex(compact_c4_box("LongevityCatalogDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 1350, 900, 380, 170, DB + "fontSize=15;spacing=8;")
    catalog = d.vertex(compact_c4_box("Catalog & Rules Service", "Container", "ASP.NET Core / REST :8082", "Catalog / rules"), 1900, 900, 500, 170, BOX + "fontSize=16;spacing=9;")
    planning_db = d.vertex(compact_c4_box("LongevityPlanningDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 2600, 900, 380, 170, DB + "fontSize=15;spacing=8;")
    planning = d.vertex(compact_c4_box("Planning Service", "Container", "ASP.NET Core / REST :8083", "Plans / challenge / FMD"), 3150, 900, 500, 170, BOX + "fontSize=16;spacing=9;")

    tracking_db = d.vertex(compact_c4_box("LongevityTrackingDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 650, 1350, 380, 170, DB + "fontSize=15;spacing=8;")
    tracking = d.vertex(compact_c4_box("Tracking & Progress Service", "Container", "ASP.NET Core / REST :8084", "Logs / LDAS / progress"), 1200, 1350, 500, 170, BOX + "fontSize=16;spacing=9;")
    worker_db = d.vertex(compact_c4_box("LongevityWorkerDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 1900, 1350, 380, 170, DB + "fontSize=15;spacing=8;")
    worker = d.vertex(compact_c4_box("Background Worker", "Container", ".NET 9 Worker / Ops :8086", "Async jobs / reports"), 2450, 1350, 500, 170, BOX + "fontSize=16;spacing=9;")
    recommendation_db = d.vertex(compact_c4_box("LongevityRecommendationDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 3150, 1350, 380, 170, DB + "fontSize=15;spacing=8;")
    recommendation = d.vertex(compact_c4_box("Recommendation Service", "Container", "gRPC / .NET 9 / :8085", "Safety filter / ranking"), 3700, 1350, 500, 170, BOX + "fontSize=16;spacing=9;")

    events = d.vertex(compact_c4_box("Event Streams", "Container - Queue", "Redis Streams 7 / :6379", "Integration events"), 350, 2050, 3900, 170, QUEUE + "fontSize=17;spacing=10;")
    optional_ai = d.vertex(compact_c4_box("Local AI Runtime", "External System / Optional", "HTTP :11434", "Explanation only"), 4450, 1350, 360, 180, EXTERNAL + "fontSize=15;spacing=9;")

    d.edge(guest, web, exit=(.5, 1), entry=(.1206896552, 0), points=[(1200, 330)])
    d.edge(member, web, exit=(.5, 1), entry=(.4655172414, 0), points=[(2200, 330)])
    d.edge(admin, web, exit=(.5, 1), entry=(.8448275862, 0), points=[(3300, 330)])
    d.text("HTTPS :443", 1218, 300, 135, 24, size=12)
    d.text("HTTPS :443", 2218, 300, 135, 24, size=12)
    d.text("HTTPS :443", 3318, 300, 135, 24, size=12)

    d.edge(web, gateway, exit=(.5, 1), entry=(.4736842105, 0), points=[(2300, 575)])
    d.text("HTTPS / REST :443", 2070, 548, 205, 24, size=12, align="center")

    d.edge(gateway, identity, exit=(.1052631579, 1), entry=(.5, 0))
    d.edge(gateway, catalog, exit=(.4342105263, 1), entry=(.5, 0))
    d.edge(gateway, planning, exit=(.7631578947, 1), entry=(.5, 0))
    d.text("REST :8081", 915, 800, 135, 24, size=12)
    d.text("REST :8082", 2165, 800, 135, 24, size=12)
    d.text("REST :8083", 3415, 800, 135, 24, size=12)

    d.edge(gateway, tracking, exit=(.1973684211, 1), entry=(.5, 0), points=[(1250, 1250), (1450, 1250)])
    d.edge(gateway, worker, exit=(.5263157895, 1), entry=(.5, 0), points=[(2500, 1250), (2700, 1250)])
    d.text("REST :8084", 1268, 1100, 135, 24, size=12)
    d.text("Ops :8086", 2518, 1100, 125, 24, size=12)

    owned_pairs = [
        (identity, identity_db, 490, 945),
        (catalog, catalog_db, 1740, 945),
        (planning, planning_db, 2990, 945),
        (tracking, tracking_db, 1040, 1395),
        (worker, worker_db, 2290, 1395),
        (recommendation, recommendation_db, 3540, 1395),
    ]
    for source, target, x, y in owned_pairs:
        d.edge(source, target, exit=(0, .5), entry=(1, .5))
        d.text("EF Core / TDS :1433", x, y, 150, 28, size=11, align="center")

    d.edge(planning, recommendation, exit=(.5, 1), entry=(.5, 0), points=[(3400, 1200), (3950, 1200)])
    d.text("gRPC / HTTP/2 :8085", 3490, 1090, 230, 28, size=12, align="center")
    d.edge(recommendation, optional_ai, style=OPTIONAL, exit=(.8, 0), entry=(.5, 0), points=[(4100, 1280), (4630, 1280)])
    d.text("HTTP :11434 / Optional", 4140, 1180, 240, 28, size=12, align="center")

    d.edge(identity, events, style=ASYNC, exit=(0, .75), entry=(.0538461538, 0), points=[(560, 1027.5)])
    d.edge(catalog, events, style=ASYNC, exit=(0, .75), entry=(.3756410256, 0), points=[(1815, 1027.5)])
    d.edge(planning, events, style=ASYNC, exit=(0, .75), entry=(.6961538462, 0), points=[(3065, 1027.5)])
    d.edge(tracking, events, style=ASYNC, exit=(.5, 1), entry=(.2820512821, 0))
    d.edge(worker, events, style=ASYNC, exit=(.5, 1), entry=(.6025641026, 0))
    d.edge(recommendation, events, style=ASYNC, exit=(.5, 1), entry=(.9230769231, 0))
    d.text("Redis :6379", 578, 1650, 125, 24, size=11)
    d.text("Redis :6379", 1833, 1650, 125, 24, size=11)
    d.text("Redis :6379", 3083, 1650, 125, 24, size=11)
    d.text("Redis :6379", 1468, 1810, 125, 24, size=11)
    d.text("Redis :6379", 2718, 1810, 125, 24, size=11)
    d.text("Redis :6379", 3968, 1810, 125, 24, size=11)

    d.text(
        "<b>Legend</b>  Solid = synchronous  |  Dashed = async/optional  |  Cylinder = owned database  |  Target Architecture only",
        900, 2420, 2800, 40, size=13, align="center"
    )
    d.save("02-c1-container-architecture.drawio")


def build_conceptual():
    d = Diagram("Conceptual-ERD", 3650, 2400)
    page_title(
        d,
        "Conceptual ERD - Longevity Diet Companion",
        "Business concepts grouped by domain. Repeated 'User [Reference]' cards denote the same User concept and prevent cross-domain spaghetti lines.",
        3250,
    )

    # ---------- Identity & personal constraints ----------
    d.vertex("", 90, 210, 850, 980, GROUP)
    group_title(d, "Identity & Personal Constraints", 125, 230, 500)

    user = concept_box(d, "User", "Account owner and authorization subject", 170, 370, 300, 120)
    profile = concept_box(d, "User Profile", "Personal preferences, schedule, timezone, and planning inputs", 560, 370, 300, 120)
    constraints = concept_box(d, "Dietary Constraints", "Allergies and excluded foods that act as hard planning/recommendation constraints", 170, 700, 300, 135)
    allergy = concept_box(d, "Allergy", "Reusable allergen reference catalog", 560, 700, 300, 120)

    d.edge(user, profile, exit=(1, .5), entry=(0, .5))
    d.text("has one", 470, 320, 90, 30, size=13, align="center")
    d.edge(user, constraints, exit=(.5, 1), entry=(.5, 0))
    d.text("defines", 380, 565, 90, 30, size=13, align="center")
    d.edge(allergy, constraints, exit=(0, .5), entry=(1, .4444444))
    d.text("referenced by", 465, 645, 100, 30, size=13, align="center")

    # ---------- Planning, catalog & rules ----------
    d.vertex("", 990, 210, 1500, 1100, GROUP)
    group_title(d, "Planning, Catalog & Versioned Rules", 1025, 230, 620)

    plan_user = concept_box(d, "User", "Same account owner", 1060, 360, 260, 110, ref=True)
    plan = concept_box(d, "Meal Plan", "Versioned 7-day or 14-day generated plan", 1420, 360, 280, 120)
    planned = concept_box(d, "Planned Meal", "Scheduled meal slot within a plan day", 1800, 360, 280, 120)
    recipe = concept_box(d, "Recipe", "Approved meal definition", 2180, 360, 250, 120)

    ruleset = concept_box(d, "Rule Set Version", "Published set of immutable rule versions used for historical traceability", 1420, 710, 280, 135)
    diet_rule = concept_box(d, "Diet Rule", "Versioned longevity-diet or lifestyle rule concept", 1800, 710, 280, 120)
    food = concept_box(d, "Food", "Food/nutrient reference used by recipes and logs", 2180, 710, 250, 120)

    d.edge(plan_user, plan, exit=(1, .5), entry=(0, .4583333))
    d.text("owns many", 1320, 315, 100, 30, size=13, align="center")
    d.edge(plan, planned, exit=(1, .5), entry=(0, .5))
    d.text("contains many", 1705, 315, 100, 30, size=13, align="center")
    d.edge(planned, recipe, exit=(1, .5), entry=(0, .5))
    d.text("references", 2085, 315, 90, 30, size=13, align="center")
    d.edge(recipe, food, exit=(.5, 1), entry=(.5, 0))
    d.text("uses many", 2350, 560, 100, 30, size=13, align="center")
    d.edge(plan, ruleset, exit=(.5, 1), entry=(.5, 0))
    d.text("generated under", 1600, 560, 150, 30, size=13, align="center")
    d.edge(ruleset, diet_rule, exit=(1, .5), entry=(0, .5625))
    d.text("contains versions of", 1705, 660, 115, 40, size=13, align="center")

    # ---------- Tracking & adherence ----------
    d.vertex("", 2540, 210, 1010, 1100, GROUP)
    group_title(d, "Tracking & Adherence", 2575, 230, 500)

    track_user = concept_box(d, "User", "Same account owner", 2610, 360, 270, 110, ref=True)
    meal_log = concept_box(d, "Meal Log", "Consumed meal record", 3160, 360, 300, 120)
    eating = concept_box(d, "Eating Window", "Daily first/last meal and eating-window snapshot", 2610, 690, 270, 125)
    activity = concept_box(d, "Activity Log", "Recorded activity session", 3160, 690, 300, 120)
    score_dimension = concept_box(d, "Score Dimension", "Explainable contribution to an adherence score", 2610, 1010, 270, 120)
    score = concept_box(d, "Adherence Score", "Daily LDAS result tied to a rule-set version", 3160, 1010, 300, 120)

    d.edge(track_user, meal_log, exit=(1, .5), entry=(0, .4583333))
    d.text("creates many", 2895, 315, 140, 30, size=13, align="center")
    d.edge(track_user, eating, exit=(.5, 1), entry=(.5, 0))
    d.text("has daily", 2810, 555, 130, 30, size=13, align="center")
    d.edge(
        track_user, activity,
        exit=(1, .75), entry=(0, .5),
        points=[(3010, 442.5), (3010, 750)]
    )
    d.text("records", 2920, 600, 80, 30, size=13, align="center")
    d.edge(activity, score, exit=(.5, 1), entry=(.5, 0))
    d.text("contributes to", 3370, 880, 120, 30, size=13, align="center")
    d.edge(score, score_dimension, exit=(0, .5), entry=(1, .5))
    d.text("breaks down into", 2885, 960, 150, 30, size=13, align="center")

    # ---------- Engagement & background outcomes ----------
    d.vertex("", 90, 1380, 1760, 820, GROUP)
    group_title(d, "Engagement & Background Outcomes", 125, 1400, 650)

    engage_user = concept_box(d, "User", "Same account owner", 170, 1535, 280, 110, ref=True)
    challenge = concept_box(d, "Challenge", "14-day adherence challenge instance", 600, 1535, 280, 120)
    challenge_day = concept_box(d, "Challenge Day", "Day-level completion and streak evidence", 1030, 1535, 280, 120)
    reminder = concept_box(d, "Reminder", "User-configured schedule processed by Worker", 170, 1850, 280, 120)
    weekly = concept_box(d, "Weekly Report", "Stored weekly progress summary generated by Worker", 600, 1850, 280, 120)
    feedback_user = concept_box(d, "User", "Same account owner", 1425, 1535, 280, 110, ref=True)
    feedback = concept_box(d, "Recommendation Feedback", "Feedback on a ranked recipe/recommendation request", 1400, 1850, 330, 120)

    d.edge(engage_user, challenge, exit=(1, .5), entry=(0, .4583333))
    d.text("starts", 475, 1490, 100, 30, size=13, align="center")
    d.edge(challenge, challenge_day, exit=(1, .5), entry=(0, .5))
    d.text("contains 14", 905, 1490, 100, 30, size=13, align="center")
    d.edge(engage_user, reminder, exit=(.5, 1), entry=(.5, 0))
    d.text("configures", 380, 1715, 120, 30, size=13, align="center")
    d.edge(
        engage_user, weekly,
        exit=(1, .75), entry=(0, .5),
        points=[(520, 1617.5), (520, 1910)]
    )
    d.text("receives", 600, 1760, 80, 30, size=13, align="center")
    d.edge(feedback_user, feedback, exit=(.5, 1), entry=(.5, 0))
    d.text("submits", 1580, 1715, 100, 30, size=13, align="center")

    # ---------- FMD safety ----------
    d.vertex("", 1910, 1380, 1640, 820, GROUP)
    group_title(d, "FMD Education & Safety Gate", 1945, 1400, 550)

    fmd_user = concept_box(d, "User", "Same account owner", 1990, 1600, 280, 110, ref=True)
    assessment = concept_box(d, "FMD Safety Assessment", "Safety-gate result: tracking allowed or professional review required", 2440, 1585, 390, 140)
    cycle = concept_box(d, "FMD Cycle", "Tracking metadata only; no autonomous therapeutic menu", 3040, 1595, 350, 120)

    d.edge(fmd_user, assessment, exit=(1, .5), entry=(0, .5))
    d.text("submits", 2290, 1535, 120, 30, size=13, align="center")
    d.edge(assessment, cycle, exit=(1, .5), entry=(0, .5))
    d.text("gates creation of", 2840, 1535, 180, 30, size=13, align="center")

    d.text(
        "<b>Conceptual scope</b>  Business meaning only. Technical reliability/operations entities "
        "(RefreshToken, OutboxMessage, ProcessedEvent, AuditLog) belong to the Physical Database view. "
        "Repeated User reference cards are the same conceptual User entity.",
        500, 2260, 2600, 70, size=13, align="center", color=MUTED,
    )
    d.save("03-conceptual-erd.drawio")



def build_physical():
    d = Diagram("Physical-Database", 5650, 3600)
    page_title(
        d,
        "Physical Database - Full Target PRN232 MVP",
        "SQL Server physical schema derived from the project database design. All 33 planned tables are shown; only key fields are displayed so the page remains readable.",
        5100,
    )

    # ---------------- Identity & Profile ----------------
    d.vertex("", 80, 210, 1100, 2220, GROUP)
    group_title(d, "Identity & Profile", 120, 230, 450)

    users = table_box(d, "Users", [
        "PK Id uniqueidentifier",
        "UQ Email / NormalizedEmail",
        "PasswordHash",
        "Role / IsActive",
        "CreatedAtUtc / UpdatedAtUtc",
    ], 150, 340, 460, 260)

    profiles = table_box(d, "UserProfiles", [
        "PK/FK UserId -> Users",
        "AgeBand / HeightCm / WeightKg",
        "DietaryPattern",
        "Sleep / Wake / TimeZoneId",
        "ReminderOptIn / UpdatedAtUtc",
    ], 680, 340, 420, 260)

    refresh = table_box(d, "RefreshTokens", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "UQ TokenHash",
        "ExpiresAtUtc / RevokedAtUtc",
        "CreatedAtUtc",
    ], 150, 740, 460, 245)

    allergies = table_box(d, "Allergies", [
        "PK Id uniqueidentifier",
        "UQ Code",
        "Name",
    ], 680, 740, 420, 190)

    user_allergies = table_box(d, "UserAllergies", [
        "PK/FK UserId -> Users",
        "PK/FK AllergyId -> Allergies",
        "Severity NULL",
        "Note NULL",
    ], 680, 1080, 420, 220)

    excluded = table_box(d, "UserExcludedFoods", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "FK FoodId -> Foods NULL",
        "FreeText NULL / Reason",
        "CK FoodId OR FreeText required",
    ], 150, 1080, 460, 240)

    d.edge(users, profiles, exit=(1, .5), entry=(0, .5))
    d.edge(users, refresh, exit=(.5, 1), entry=(.5, 0))
    d.edge(allergies, user_allergies, exit=(.5, 1), entry=(.5, 0))

    # ---------------- Catalog & Rules ----------------
    d.vertex("", 1240, 210, 1500, 2220, GROUP)
    group_title(d, "Catalog & Versioned Rules", 1280, 230, 560)

    foods = table_box(d, "Foods", [
        "PK Id uniqueidentifier",
        "Name / NormalizedName",
        "Category / ServingAmount / Unit",
        "Calories / Protein / Carb / Fat",
        "SaturatedFat / Sugar / Fiber NULL",
        "Plant/WholeGrain/Legume/Fish flags",
        "IsActive / IsDeleted",
    ], 1320, 340, 560, 310)

    recipes = table_box(d, "Recipes", [
        "PK Id uniqueidentifier",
        "Name / Description",
        "MealType / PrepMinutes",
        "InstructionsSummary",
        "IsPlantForward",
        "IsActive / IsDeleted",
    ], 2070, 340, 560, 285)

    ingredients = table_box(d, "RecipeIngredients", [
        "PK/FK RecipeId -> Recipes",
        "PK/FK FoodId -> Foods",
        "Amount / Unit",
        "IsOptional",
    ], 1695, 780, 560, 225)

    recipe_allergens = table_box(d, "RecipeAllergens", [
        "PK/FK RecipeId -> Recipes",
        "PK/FK AllergyId -> Allergies",
        "Derived or cached mapping",
    ], 2070, 1100, 560, 205)

    diet_rules = table_box(d, "DietRules", [
        "PK Id uniqueidentifier",
        "UQ Code",
        "Name / Category",
        "IsMedicalSensitive",
        "IsActive",
    ], 1320, 1430, 560, 235)

    rule_versions = table_box(d, "RuleVersions", [
        "PK Id uniqueidentifier",
        "FK DietRuleId -> DietRules",
        "UQ VersionNumber per rule",
        "RuleType / ParametersJson",
        "SourceType / Title / Url",
        "EvidenceLevel / EffectiveFromUtc",
        "PublishedAtUtc / PublishedByUserId",
        "IsCurrent",
    ], 2070, 1430, 560, 330)

    rulesets = table_box(d, "RuleSetVersions", [
        "PK Id uniqueidentifier",
        "UQ VersionLabel",
        "PublishedAtUtc",
        "FK PublishedByUserId -> Users",
    ], 1320, 1930, 560, 220)

    ruleset_items = table_box(d, "RuleSetVersionItems", [
        "PK/FK RuleSetVersionId",
        "PK/FK RuleVersionId",
        "Immutable membership",
    ], 2070, 1930, 560, 200)

    # Two clean top-down lanes to the join table.
    d.edge(
        foods, ingredients,
        exit=(.50, 1), entry=(.30, 0),
        points=[(1600, 710), (1863, 710)]
    )
    d.edge(
        recipes, ingredients,
        exit=(.50, 1), entry=(.70, 0),
        points=[(2350, 710), (2087, 710)]
    )
    d.edge(
        recipes, recipe_allergens,
        exit=(1, .60), entry=(.5, 0),
        points=[(2690, 511), (2690, 1060), (2350, 1060)]
    )
    d.edge(diet_rules, rule_versions, exit=(1, .5), entry=(0, .3560606))
    d.edge(rulesets, ruleset_items, exit=(1, .5), entry=(0, .55))
    d.edge(rule_versions, ruleset_items, exit=(.5, 1), entry=(.5, 0))

    # ---------------- Planning & Tracking ----------------
    d.vertex("", 2800, 210, 1500, 2220, GROUP)
    group_title(d, "Planning & Tracking", 2840, 230, 500)

    plans = table_box(d, "MealPlans", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "StartDate / EndDate / Revision",
        "FK RuleSetVersionId",
        "Status / GeneratedAtUtc",
    ], 2880, 340, 590, 245)

    plan_days = table_box(d, "MealPlanDays", [
        "PK Id uniqueidentifier",
        "FK MealPlanId -> MealPlans",
        "Date",
        "UQ MealPlanId + Date",
    ], 2880, 720, 590, 210)

    planned_meals = table_box(d, "PlannedMeals", [
        "PK Id uniqueidentifier",
        "FK MealPlanDayId -> MealPlanDays",
        "FK RecipeId -> Recipes NULL",
        "MealType / ScheduledTime NULL",
        "Position / IsReplaced",
        "RecommendationReasonJson",
    ], 2880, 1070, 590, 270)

    meal_logs = table_box(d, "MealLogs", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "ConsumedAtUtc / MealType",
        "Note NULL",
        "IsDeleted / CreatedAtUtc",
    ], 3610, 340, 590, 245)

    meal_items = table_box(d, "MealLogItems", [
        "PK Id uniqueidentifier",
        "FK MealLogId -> MealLogs",
        "FK FoodId -> Foods NULL",
        "FK RecipeId -> Recipes NULL",
        "Amount / Unit",
        "CK FoodId XOR RecipeId",
    ], 3610, 720, 590, 270)

    activities = table_box(d, "ActivityLogs", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "ActivityType / StartedAtUtc",
        "DurationMinutes / Intensity",
        "Note NULL / IsDeleted",
    ], 3610, 1120, 590, 245)

    eating_windows = table_box(d, "EatingWindowSnapshots", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "LocalDate",
        "FirstMealAtUtc / LastMealAtUtc",
        "WindowMinutes",
        "MinutesBeforeSleep NULL",
        "UQ UserId + LocalDate",
    ], 3610, 1510, 590, 285)

    d.edge(plans, plan_days, exit=(.5, 1), entry=(.5, 0))
    d.edge(plan_days, planned_meals, exit=(.5, 1), entry=(.5, 0))
    d.edge(meal_logs, meal_items, exit=(.5, 1), entry=(.5, 0))

    # ---------------- Progress, Engagement & Safety ----------------
    d.vertex("", 4360, 210, 1210, 2220, GROUP)
    group_title(d, "Progress, Engagement & Safety", 4400, 230, 650)

    scores = table_box(d, "AdherenceScores", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "LocalDate / Score decimal(5,2)",
        "FK RuleSetVersionId",
        "IsPartial / MissingDataJson",
        "CalculatedAtUtc",
        "UQ UserId + Date + RuleSetVersionId",
    ], 4430, 340, 500, 285)

    score_dims = table_box(d, "ScoreDimensions", [
        "PK Id uniqueidentifier",
        "FK AdherenceScoreId",
        "DimensionCode / Weight",
        "RawScore / WeightedScore",
        "ExplanationJson",
    ], 4430, 760, 500, 240)

    challenges = table_box(d, "Challenges", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "ChallengeType",
        "StartedOn / EndsOn",
        "Status / CurrentStreak",
    ], 5010, 340, 490, 245)

    challenge_days = table_box(d, "ChallengeDays", [
        "PK Id uniqueidentifier",
        "FK ChallengeId -> Challenges",
        "DayNumber / TemplateCode",
        "CompletionRuleJson",
        "CompletedAtUtc NULL",
        "UQ ChallengeId + DayNumber",
    ], 5010, 760, 490, 265)

    feedback = table_box(d, "RecommendationFeedback", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "RequestId",
        "FK RecipeId -> Recipes",
        "FeedbackType / Comment NULL",
        "CreatedAtUtc",
    ], 4430, 1130, 500, 260)

    fmd_assessment = table_box(d, "FmdSafetyAssessments", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "SubmittedAtUtc / AnswersJson",
        "Result",
        "AcknowledgedAtUtc",
    ], 5010, 1130, 490, 245)

    fmd_cycles = table_box(d, "FmdCycles", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "FK SafetyAssessmentId",
        "PlannedStartDate / PlannedEndDate",
        "Status / ClinicianApproved NULL",
        "Note NULL",
    ], 5010, 1510, 490, 270)

    reminders = table_box(d, "Reminders", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "ReminderType / ScheduleLocalTime",
        "DaysOfWeekJson",
        "IsEnabled / NextDueAtUtc",
    ], 4430, 1510, 500, 245)

    weekly_reports = table_box(d, "WeeklyReports", [
        "PK Id uniqueidentifier",
        "FK UserId -> Users",
        "WeekStartDate",
        "SummaryJson / GeneratedAtUtc",
        "UQ UserId + WeekStartDate",
    ], 4430, 1900, 500, 230)

    d.edge(scores, score_dims, exit=(.5, 1), entry=(.5, 0))
    d.edge(challenges, challenge_days, exit=(.5, 1), entry=(.5, 0))
    d.edge(fmd_assessment, fmd_cycles, exit=(.5, 1), entry=(.5, 0))

    # ---------------- Messaging & Operations ----------------
    d.vertex("", 700, 2600, 4200, 690, GRAY_GROUP)
    group_title(d, "Messaging, Reliability & Operations", 750, 2620, 700)

    outbox = table_box(d, "OutboxMessages", [
        "PK Id / EventId",
        "EventType / PayloadJson",
        "OccurredAtUtc",
        "PublishedAtUtc NULL",
        "AttemptCount / LastError",
        "IX PublishedAtUtc + OccurredAtUtc",
    ], 900, 2750, 1000, 300)

    processed = table_box(d, "ProcessedEvents", [
        "PK EventId",
        "ConsumerName",
        "ProcessedAtUtc",
        "UQ EventId + ConsumerName",
        "Idempotency record",
    ], 2300, 2750, 1000, 270)

    audit = table_box(d, "AuditLogs", [
        "PK Id uniqueidentifier",
        "FK ActorUserId -> Users",
        "Action / EntityType / EntityId",
        "SafeDiffJson / CorrelationId",
        "OccurredAtUtc",
        "IX EntityType+EntityId",
        "IX ActorUserId+OccurredAtUtc",
    ], 3700, 2750, 1000, 310)

    d.text(
        "<b>Relationship notation</b>  Local parent/child relationships are drawn. "
        "Cross-domain foreign keys are written inside table fields to prevent line/table collisions.",
        1150, 3160, 3300, 50, size=14, align="center", color=MUTED,
    )
    d.text(
        "<b>Implementation status</b>  Implemented baseline now: Users, UserProfiles, RefreshTokens. "
        "All other tables are the agreed Target Assignment MVP from docs/06-DATABASE-DESIGN.md.",
        1150, 3230, 3300, 50, size=14, align="center", color=MUTED,
    )
    d.text(
        "<b>Integrity highlights</b>  Historical catalog data uses soft delete; published RuleVersion is immutable; "
        "MealPlan owns MealPlanDay/PlannedMeal; Outbox + ProcessedEvent provide reliable/idempotent async processing.",
        780, 3420, 4050, 55, size=13, align="center",
    )

    d.save("04-physical-database.drawio")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate LongevityDiet assignment diagrams")
    parser.add_argument(
        "--only",
        default="all",
        help="Comma-separated: c0,c1,conceptual,physical (default: all)",
    )
    args = parser.parse_args()
    selected = {part.strip().lower() for part in args.only.split(",")}
    if "all" in selected:
        selected = {"c0", "c1", "conceptual", "physical"}

    builders = {
        "c0": build_c0,
        "c1": build_c1,
        "conceptual": build_conceptual,
        "physical": build_physical,
    }
    unknown = selected - builders.keys()
    if unknown:
        raise SystemExit(f"Unknown diagram selector(s): {sorted(unknown)}")
    for name in ("c0", "c1", "conceptual", "physical"):
        if name in selected:
            builders[name]()
    print("Generated", ", ".join(sorted(selected)), "in", OUT)
