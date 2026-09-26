from pathlib import Path
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = Path(r"D:\PRN232\PRN232_LongevityDiet")
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
        ET.ElementTree(self.mxfile).write(
            OUT / filename, encoding="utf-8", xml_declaration=True
        )

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
    d = Diagram("C0-System-Context", 2200, 1180)
    page_title(
        d,
        "C0 - System Context - Longevity Diet Companion",
        "Business context only: people, the Longevity Diet Companion software system, and its direct external dependency.",
        2020,
    )

    guest = d.vertex(actor_value("Guest"), 170, 280, 170, 160, ACTOR)
    member = d.vertex(actor_value("Member"), 170, 500, 170, 160, ACTOR)
    admin = d.vertex(actor_value("Administrator"), 170, 720, 170, 160, ACTOR)

    system = d.vertex(
        c4_box(
            "Longevity Diet Companion",
            "Software System",
            "",
            "Turns longevity-diet principles into safe, explainable planning, tracking, recommendation, adherence, challenge, reminder, and progress workflows.",
        ),
        850, 255, 760, 600,
        SOFTWARE_SYSTEM + "fontSize=20;spacing=24;"
    )

    optional_ai = d.vertex(
        c4_box(
            "Optional Local AI Runtime",
            "External Software System - Optional",
            "Local LLM / Ollama-style HTTP API",
            "Rewrites already-computed explanations only. It never changes ranking, allergy/safety constraints, or LDAS.",
        ),
        1760, 450, 330, 230,
        EXTERNAL + "fontSize=16;spacing=14;"
    )

    # Straight, independent relationship lanes.
    d.edge(guest, system, exit=(1, .5), entry=(0, .175))
    d.edge(member, system, exit=(1, .5), entry=(0, .5416667))
    d.edge(admin, system, exit=(1, .5), entry=(0, .9083333))
    d.edge(system, optional_ai, style=OPTIONAL, exit=(1, .5166667), entry=(0, .5))

    # Labels live in whitespace above each relationship; no text touches a connector.
    d.text("Views public information, registers, and signs in", 390, 300, 390, 34, size=14, align="center")
    d.text("Plans, tracks, requests recommendations, and reviews progress", 385, 520, 410, 36, size=14, align="center")
    d.text("Manages catalog, rules, audit, event, and job operations", 390, 740, 400, 36, size=14, align="center")
    d.text("Optional explanation rewrite", 1615, 515, 140, 34, size=13, align="center")

    d.text(
        "<b>C0 scope</b>  Internal technologies and containers are intentionally hidden. "
        "The optional local AI runtime is shown only because it is a directly connected external software system.",
        600, 935, 1100, 48, size=13, align="center", color=MUTED,
    )
    d.text(
        "<b>Legend</b>  Person = actor  |  Warm card = software system  |  Dashed card/arrow = optional external dependency  |  Arrow = directed relationship",
        330, 1055, 1540, 42, size=13, align="center",
    )
    d.save("01-c0-system-context.drawio")


def build_c1():
    d = Diagram("C1-Container", 2500, 1560)
    page_title(
        d,
        "C1 - Target Container Architecture - Longevity Diet Companion",
        "Web-only target PRN232 MVP: deployable containers, responsibilities, technologies, and communication protocols.",
        2300,
    )

    # Original composition inspired by the supplied reference image without copying its services.
    d.vertex("", 180, 330, 1900, 1090, BOUNDARY, cid="ldc-boundary")
    d.text("<b>Longevity Diet Companion</b>  [Software System Boundary]", 215, 1380, 760, 36, size=15)

    # Direct people outside the software-system boundary.
    guest = d.vertex(actor_value("Guest"), 520, 150, 150, 150, ACTOR)
    member = d.vertex(actor_value("Member"), 1110, 150, 150, 150, ACTOR)
    admin = d.vertex(actor_value("Administrator"), 1700, 150, 150, 150, ACTOR)

    # Runtime containers.
    web = d.vertex(
        c4_box(
            "Web Application",
            "Container",
            "React 19 + TypeScript + Vite + Nginx",
            "Browser SPA for public, member, and admin screens. Nginx serves the build and reverse-proxies /api requests.",
        ),
        480, 400, 1300, 170,
        BOX + "fontSize=18;spacing=15;"
    )

    api = d.vertex(
        c4_box(
            "REST API",
            "Container",
            "ASP.NET Core .NET 9 + EF Core 9",
            "JWT and role authorization; REST CRUD/query workflows; business orchestration; EF Core persistence; transactional Outbox; gRPC client.",
        ),
        740, 700, 780, 220,
        BOX + "fontSize=18;spacing=15;"
    )

    recommendation = d.vertex(
        c4_box(
            "Recommendation Service",
            "Container",
            "ASP.NET Core gRPC .NET 9",
            "Independent service for hard safety filters, deterministic ranking, score components, and explainable reason codes.",
        ),
        250, 715, 360, 190,
        BOX + "fontSize=17;spacing=13;"
    )

    database = d.vertex(
        c4_box(
            "SQL Server",
            "Container - Database",
            "SQL Server 2022 + EF Core migrations",
            "Primary system of record for identity, profile, catalog, rules, plans, logs, progress, Outbox, audit, and idempotency.",
        ),
        300, 1060, 580, 240,
        DB + "fontSize=17;spacing=13;"
    )

    worker = d.vertex(
        c4_box(
            "Background Worker",
            "Container",
            ".NET 9 Worker Service",
            "Publishes pending Outbox events, consumes idempotently, and runs reminders, recalculation, weekly reports, retry, and dead-letter workflows.",
        ),
        1030, 1070, 430, 220,
        BOX + "fontSize=17;spacing=13;"
    )

    redis = d.vertex(
        c4_box(
            "Application Event Streams",
            "Container - Queue/Topic Data Store",
            "Redis 7 Streams",
            "Logical domain/notification streams with consumer groups, acknowledgements, retry, and dead-letter handling.",
        ),
        1630, 1070, 420, 220,
        QUEUE + "fontSize=17;spacing=13;"
    )

    optional_ai = d.vertex(
        c4_box(
            "Optional Local AI Runtime",
            "External Software System - Optional",
            "Local LLM / Ollama-style HTTP API",
            "Explanation rewrite only. Ranking, allergy/safety hard constraints, and LDAS always remain deterministic.",
        ),
        2140, 705, 300, 210,
        EXTERNAL + "fontSize=15;spacing=12;"
    )

    # People -> Web: vertical HTTPS lanes.
    d.edge(guest, web, exit=(.5, 1), entry=(.0884615, 0))
    d.edge(member, web, exit=(.5, 1), entry=(.5423077, 0))
    d.edge(admin, web, exit=(.5, 1), entry=(.9961538, 0))
    d.text("HTTPS", 610, 335, 82, 28, size=13, align="center")
    d.text("HTTPS", 1200, 335, 82, 28, size=13, align="center")
    d.text("HTTPS", 1790, 335, 82, 28, size=13, align="center")

    # Web -> API: one clear vertical application lane.
    d.edge(web, api, exit=(.5, 1), entry=(.5, 0))
    d.text(
        "Calls application API<br><b>HTTPS + REST/JSON</b>",
        1175, 605, 300, 56, size=13, align="center"
    )

    # API -> Recommendation: horizontal typed service call.
    d.edge(api, recommendation, exit=(0, .5), entry=(1, .5))
    d.text(
        "Rank meal alternatives<br><b>gRPC / HTTP2</b>",
        615, 740, 120, 54, size=13, align="center"
    )

    # API -> SQL: business state and Outbox in one transaction.
    d.edge(
        api, database,
        exit=(.225641, 1), entry=(.5, 0),
        points=[(916, 975), (590, 975)]
    )
    d.text("Business state + Outbox", 560, 930, 250, 30, size=13, align="center")
    d.text("EF Core / TDS", 930, 930, 145, 30, size=13, align="center")

    # Worker -> SQL: a separate horizontal persistence lane.
    d.edge(worker, database, exit=(0, .5), entry=(1, .5))
    d.text(
        "Read Outbox / write async results<br><b>EF Core / TDS</b>",
        885, 1115, 140, 52, size=13, align="center"
    )

    # Worker <-> Redis Streams: parallel asynchronous lanes.
    d.edge(worker, redis, style=ASYNC, exit=(1, .27), entry=(0, .27))
    d.text("Publish events<br><b>XADD</b>", 1465, 1075, 160, 42, size=13, align="center")

    d.edge(redis, worker, style=ASYNC, exit=(0, .70), entry=(1, .70))
    d.text(
        "Consume + acknowledge<br><b>XREADGROUP + XACK</b>",
        1462, 1238, 165, 48, size=13, align="center"
    )

    # API -> Optional AI: optional direct external dependency.
    d.edge(api, optional_ai, style=OPTIONAL, exit=(1, .5), entry=(0, .5))
    d.text(
        "Optional explanation rewrite<br><b>Local HTTP/JSON</b>",
        1600, 740, 500, 52, size=13, align="center"
    )

    d.text(
        "<b>Legend</b>  Person = actor  |  White card = container  |  Cylinder = database  |  "
        "Queue card = logical Redis stream(s)  |  Solid = synchronous  |  Dashed = asynchronous/optional",
        360, 1490, 1780, 44, size=13, align="center",
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
    build_c0()
    build_c1()
    build_conceptual()
    build_physical()
    print("Generated 4 full Assignment diagrams in", OUT)
