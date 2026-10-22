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
QUEUE = BOX
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

    def save(self, filename, output_dir=None):
        ET.indent(self.mxfile, space="  ")
        target_dir = Path(output_dir) if output_dir else OUT
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / filename
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
    d = Diagram("C0-System-Context", 1800, 1000)
    page_title(
        d,
        "C0 - C4 System Context - Longevity Diet Companion",
        "People, the system, and direct external systems only.",
        1640,
    )

    guest = d.vertex(actor_value("Guest"), 100, 225, 160, 140, ACTOR)
    member = d.vertex(actor_value("Member"), 100, 430, 160, 140, ACTOR)
    admin = d.vertex(actor_value("Administrator"), 100, 635, 160, 140, ACTOR)

    system_style = BOX + "fillColor=#F3F4F6;strokeColor=#1F2937;strokeWidth=3;"
    system = d.vertex(
        compact_c4_box(
            "Longevity Diet Companion",
            "Software System",
            "",
            "Plan / Track / Recommend",
        ),
        590, 225, 560, 550,
        system_style + "fontSize=20;spacing=20;"
    )

    optional_ai = d.vertex(
        compact_c4_box(
            "Local AI Runtime",
            "External Software System / Optional",
            "",
            "Explanation rewrite only",
        ),
        1420, 405, 280, 190,
        EXTERNAL + "fontSize=16;spacing=14;"
    )

    d.edge(guest, system, exit=(1, .5), entry=(0, .1272727273))
    d.edge(member, system, exit=(1, .5), entry=(0, .50))
    d.edge(admin, system, exit=(1, .5), entry=(0, .8727272727))
    d.edge(system, optional_ai, style=OPTIONAL, exit=(1, .50), entry=(0, .50))

    d.text("Browse / Sign in", 315, 250, 190, 28, size=14, align="center")
    d.text("Plan / Track", 315, 455, 190, 28, size=14, align="center")
    d.text("Manage", 315, 660, 190, 28, size=14, align="center")
    d.text("Rewrite explanation", 1195, 455, 190, 28, size=13, align="center")

    d.text(
        "<b>Legend</b>  Person = actor  |  Solid = system in scope  |  Dashed = optional external dependency",
        350, 900, 1100, 36, size=13, align="center",
    )
    d.save("01-c0-system-context.drawio")


def build_c1():
    d = Diagram("C1-Container", 2800, 1600)
    page_title(
        d,
        "C1 - C4 Container - Longevity Diet Companion (Target Architecture)",
        "Target containers, owned logical databases, protocols, and integration events.",
        2500,
    )

    boundary_style = (
        "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;fillOpacity=0;"
        "strokeColor=#9CA3AF;strokeWidth=2;dashed=1;dashPattern=8 6;"
    )
    d.vertex("", 70, 300, 2380, 1220, boundary_style, cid="ldc-boundary")
    d.text("<b>Longevity Diet Companion</b>", 100, 315, 330, 30, size=16)

    guest = d.vertex(actor_value("Guest"), 450, 130, 140, 130, ACTOR)
    member = d.vertex(actor_value("Member"), 1280, 130, 140, 130, ACTOR)
    admin = d.vertex(actor_value("Administrator"), 2030, 130, 140, 130, ACTOR)

    web = d.vertex(
        compact_c4_box("Web Application", "Container", "React / TypeScript / HTTPS :443", "Browser UI"),
        320, 370, 1850, 105, BOX + "fontSize=17;spacing=8;"
    )
    gateway = d.vertex(
        compact_c4_box("API Gateway", "Container", "YARP / .NET 9 / :8080", "Routing / edge policy"),
        320, 530, 1850, 115, BOX + "fontSize=17;spacing=8;"
    )

    identity = d.vertex(compact_c4_box("Identity & Profile Service", "Container", "ASP.NET Core / REST :8081", "Auth / profile"), 150, 760, 410, 135, BOX + "fontSize=16;spacing=8;")
    catalog = d.vertex(compact_c4_box("Catalog & Rules Service", "Container", "ASP.NET Core / REST :8082", "Catalog / rules"), 720, 760, 410, 135, BOX + "fontSize=16;spacing=8;")
    planning = d.vertex(compact_c4_box("Planning Service", "Container", "ASP.NET Core / REST :8083", "Plans / challenge / FMD"), 1290, 760, 410, 135, BOX + "fontSize=16;spacing=8;")
    tracking = d.vertex(compact_c4_box("Tracking & Progress Service", "Container", "ASP.NET Core / REST :8084", "Logs / LDAS / progress"), 1860, 760, 410, 135, BOX + "fontSize=16;spacing=8;")

    identity_db = d.vertex(compact_c4_box("LongevityIdentityDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 190, 960, 330, 115, DB + "fontSize=15;spacing=6;")
    catalog_db = d.vertex(compact_c4_box("LongevityCatalogDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 760, 960, 330, 115, DB + "fontSize=15;spacing=6;")
    planning_db = d.vertex(compact_c4_box("LongevityPlanningDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 1330, 960, 330, 115, DB + "fontSize=15;spacing=6;")
    tracking_db = d.vertex(compact_c4_box("LongevityTrackingDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 1900, 960, 330, 115, DB + "fontSize=15;spacing=6;")

    worker = d.vertex(compact_c4_box("Background Worker", "Container", ".NET 9 Worker / Ops :8086", "Async jobs / reports"), 780, 1100, 420, 110, BOX + "fontSize=16;spacing=7;")
    worker_db = d.vertex(compact_c4_box("LongevityWorkerDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 780, 1250, 420, 95, DB + "fontSize=14;spacing=5;")
    recommendation = d.vertex(compact_c4_box("Recommendation Service", "Container", "gRPC / .NET 9 / :8085", "Safety / ranking"), 1900, 1100, 420, 110, BOX + "fontSize=16;spacing=7;")
    recommendation_db = d.vertex(compact_c4_box("LongevityRecommendationDb", "Container / Database", "SQL Server 2022 / :1433", "Owned data"), 1900, 1250, 420, 95, DB + "fontSize=14;spacing=5;")

    events = d.vertex(compact_c4_box("Event Streams", "Container - Queue", "Redis Streams 7 / :6379", "Integration events"), 350, 1400, 1850, 100, QUEUE + "fontSize=16;spacing=8;")
    optional_ai = d.vertex(compact_c4_box("Local AI Runtime", "External System / Optional", "HTTP :11434", "Explanation only"), 2510, 1100, 250, 160, EXTERNAL + "fontSize=15;spacing=7;")

    # Actors -> Web: exact vertical lanes.
    d.edge(guest, web, exit=(.5, 1), entry=(.1081081081, 0))
    d.edge(member, web, exit=(.5, 1), entry=(.5567567568, 0))
    d.edge(admin, web, exit=(.5, 1), entry=(.9621621622, 0))
    d.text("HTTPS :443", 535, 318, 105, 24, size=12)
    d.text("HTTPS :443", 1365, 318, 105, 24, size=12)
    d.text("HTTPS :443", 2115, 318, 105, 24, size=12)

    d.edge(web, gateway, exit=(.5, 1), entry=(.5, 0))
    d.text("HTTPS / REST :443", 1260, 490, 170, 24, size=12)

    # Gateway -> REST services: exact vertical fan-out.
    d.edge(gateway, identity, exit=(.0189189189, 1), entry=(.5, 0))
    d.edge(gateway, catalog, exit=(.3270270270, 1), entry=(.5, 0))
    d.edge(gateway, planning, exit=(.6351351351, 1), entry=(.5, 0))
    d.edge(gateway, tracking, exit=(.9432432432, 1), entry=(.5, 0))
    d.text("REST :8081", 370, 685, 100, 22, size=12)
    d.text("REST :8082", 940, 685, 100, 22, size=12)
    d.text("REST :8083", 1510, 685, 100, 22, size=12)
    d.text("REST :8084", 2080, 685, 100, 22, size=12)

    # Admin operations route uses the catalog/planning whitespace corridor.
    d.edge(gateway, worker, exit=(.4864864865, 1), entry=(.7619047619, 0), points=[(1220, 1060), (1100, 1060)])
    d.text("Ops :8086", 1080, 700, 80, 22, size=12)

    # Service-owned databases.
    for source, target, line_x in [
        (identity, identity_db, 355),
        (catalog, catalog_db, 925),
        (planning, planning_db, 1495),
        (tracking, tracking_db, 2065),
    ]:
        d.edge(source, target, exit=(.5, 1), entry=(.5, 0))
        d.text("EF Core / TDS :1433", line_x + 28, 910, 145, 22, size=12)

    d.edge(worker, worker_db, exit=(.5, 1), entry=(.5, 0))
    d.text("TDS :1433", 880, 1222, 80, 18, size=12)
    d.edge(recommendation, recommendation_db, exit=(.5, 1), entry=(.5, 0))
    d.text("TDS :1433", 2010, 1222, 80, 18, size=12)

    # Planning -> Recommendation through a dedicated gap between Planning and Tracking.
    d.edge(planning, recommendation, exit=(1, 1), entry=(0, .3181818182), points=[(1745, 895), (1745, 1135), (1860, 1135)])
    d.text("gRPC / HTTP/2 :8085", 1510, 1085, 160, 22, size=12)

    # Optional external AI is aligned with Recommendation for a short, direct relation.
    d.edge(recommendation, optional_ai, style=OPTIONAL, exit=(1, .5), entry=(0, .34375))
    d.text("HTTP :11434", 2370, 1080, 110, 22, size=12)

    # Event Streams stay compact at C1: representative producer/consumer relationships are shown.
    # Tracking -> Streams remains explicit in Structurizr and the Async Dynamic view to avoid a non-planar C1 crossing.
    d.edge(identity, events, style=ASYNC, exit=(0, .70), entry=(.0702702703, 0), points=[(100, 854.5), (100, 1360), (480, 1360)])
    d.edge(catalog, events, style=ASYNC, exit=(0, .70), entry=(.1621621622, 0), points=[(650, 854.5), (650, 1360)])
    d.edge(planning, events, style=ASYNC, exit=(0, .70), entry=(.4864864865, 0), points=[(1250, 854.5), (1250, 1360)])
    d.text("Publish", 130, 1170, 80, 22, size=12)
    d.text("Publish", 500, 1170, 80, 22, size=12)
    d.text("Publish", 1280, 1170, 80, 22, size=12)

    # Consumers are explicit; detailed XREADGROUP/XACK/result ordering stays in the Dynamic view.
    d.edge(worker, events, style=ASYNC, exit=(0, .75), entry=(.2108108108, 0), points=[(730, 1182.5), (730, 1360), (740, 1360)])
    d.edge(recommendation, events, style=ASYNC, exit=(0, .75), entry=(.8108108108, 0), points=[(1850, 1182.5), (1850, 1360)])
    d.text("Read / Ack / Publish", 760, 1355, 160, 22, size=12)
    d.text("Read snapshot", 1660, 1355, 130, 22, size=12)
    d.text(
        "<b>Legend</b>  Solid = synchronous  |  Dashed = async/optional  |  Cylinder = owned DB  |  C1 = Target Architecture",
        650, 1535, 1500, 34, size=13, align="center"
    )
    d.save("02-c1-container-architecture.drawio")


def build_cloud_docker_deployment():
    d = Diagram("Cloud-Docker-Deployment", 2500, 1450)
    page_title(
        d,
        "C4 Deployment - Cloud Docker Target - Longevity Diet Companion",
        "Target only: one cloud VM, Docker Compose, private service network, and persistent named volumes.",
        2250,
    )

    cloud_style = "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;fillOpacity=0;strokeColor=#6B7280;strokeWidth=2;dashed=1;dashPattern=8 6;"
    node_style = "rounded=0;whiteSpace=wrap;html=1;fillColor=#F9FAFB;fillOpacity=30;strokeColor=#9CA3AF;strokeWidth=2;dashed=1;dashPattern=6 5;"

    d.vertex("", 260, 160, 2050, 1200, cloud_style, cid="cloud-boundary")
    d.text("<b>Cloud Provider / IaaS</b>", 290, 175, 300, 30, size=16)
    d.vertex("", 400, 230, 1880, 1080, node_style, cid="vm-boundary")
    d.text("<b>Virtual Machine</b>  [Linux / Deployment Node]", 430, 245, 420, 30, size=15)
    d.vertex("", 520, 300, 1690, 910, node_style, cid="docker-boundary")
    d.text("<b>Docker Engine</b>", 550, 315, 260, 28, size=15)
    d.vertex("", 620, 370, 1570, 650, node_style, cid="compose-boundary")
    d.text("<b>Docker Compose</b>", 650, 385, 260, 28, size=15)
    d.vertex("", 700, 440, 1450, 520, node_style, cid="network-boundary")
    d.text("<b>ldc-network</b>  [private Docker network / service DNS]", 730, 455, 520, 28, size=14)

    browser = d.vertex(
        compact_c4_box("User Browser", "External Client", "HTTPS :443", "Public entry only"),
        35, 505, 180, 120, EXTERNAL + "fontSize=15;spacing=7;"
    )
    web = d.vertex(
        compact_c4_box("Web Edge", "Container Instance", "Nginx + SPA / :443", "TLS + static UI"),
        760, 510, 300, 110, BOX + "fontSize=15;spacing=7;"
    )
    gateway = d.vertex(
        compact_c4_box("API Gateway", "Container Instance", "YARP / :8080", "Private routing"),
        1170, 510, 300, 110, BOX + "fontSize=15;spacing=7;"
    )
    domains = d.vertex(
        "<b>Domain Services</b><br><font style='font-size:13px'>[4 Container Instances]</font><br>"
        "<font style='font-size:13px'>Identity :8081 | Catalog :8082</font><br>"
        "<font style='font-size:13px'>Planning :8083 | Tracking :8084</font>",
        760, 690, 710, 150, BOX + "fontSize=15;spacing=8;"
    )
    recommendation = d.vertex(
        compact_c4_box("Recommendation :8085", "Container Instance", "gRPC / HTTP/2", "Safety + ranking"),
        760, 870, 300, 100, BOX + "fontSize=15;spacing=6;"
    )
    worker = d.vertex(
        compact_c4_box("Worker :8086", "Container Instance", ".NET 9 Worker", "Async jobs"),
        1170, 870, 300, 100, BOX + "fontSize=15;spacing=6;"
    )
    sql = d.vertex(
        compact_c4_box("SQL Server :1433", "Container Instance", "SQL Server 2022", "6 owned logical DBs"),
        1810, 695, 300, 140, DB + "fontSize=15;spacing=6;"
    )
    redis = d.vertex(
        compact_c4_box("Redis :6379", "Container Instance", "Redis Streams :6379", "Async transport"),
        1510, 870, 260, 100, BOX + "fontSize=15;spacing=6;"
    )

    sql_volume = d.vertex(
        "<b>sql-data</b><br><font style='font-size:13px'>[Docker named volume]</font><br>"
        "<font style='font-size:13px'>mount -> /var/opt/mssql</font>",
        1810, 1080, 300, 85, BOX + "fontSize=15;spacing=6;"
    )
    redis_volume = d.vertex(
        "<b>redis-data</b><br><font style='font-size:13px'>[Docker named volume]</font><br>"
        "<font style='font-size:13px'>mount -> /data (AOF)</font>",
        1510, 1080, 260, 85, BOX + "fontSize=15;spacing=6;"
    )
    disk = d.vertex(
        "<b>Persistent Disk</b><br><font style='font-size:13px'>[Cloud block storage attached to VM]</font><br>"
        "<font style='font-size:13px'>Docker-managed named-volume data survives container recreation</font>",
        1320, 1220, 780, 80, BOX + "fontSize=15;spacing=6;"
    )

    d.edge(browser, web, exit=(1, .5), entry=(0, .5))
    d.text("HTTPS :443", 365, 535, 150, 24, size=13, align="center")
    d.edge(web, gateway, exit=(1, .5), entry=(0, .5))
    d.text("HTTP/REST :8080", 1065, 535, 120, 24, size=12, align="center")
    d.edge(gateway, domains, exit=(.5, 1), entry=(.5, 0), points=[(1320, 660), (1115, 660)])
    d.text("REST :8081-:8084", 1160, 630, 150, 22, size=12)
    d.edge(domains, sql, exit=(1, .5), entry=(0, .5))
    d.text("TDS :1433", 1550, 730, 100, 22, size=12)
    d.edge(domains, recommendation, exit=(.2112676056, 1), entry=(.5, 0))
    # Planning is the gRPC caller inside the Domain Services deployment group.
    d.text("gRPC / HTTP/2 :8085", 950, 842, 170, 20, size=12)
    d.edge(worker, redis, style=ASYNC, exit=(1, .5), entry=(0, .5))
    # Redis protocol/port is carried by the Redis deployment node.

    d.edge(sql, sql_volume, exit=(.5, 1), entry=(.5, 0))
    d.text("volume mount", 1980, 950, 110, 20, size=12)
    d.edge(redis, redis_volume, exit=(.5, 1), entry=(.5, 0))
    d.text("volume mount", 1660, 1005, 110, 20, size=12)
    d.edge(sql_volume, disk, exit=(.5, 1), entry=(.8205128205, 0))
    d.edge(redis_volume, disk, exit=(.5, 1), entry=(.4102564103, 0))

    d.text(
        "<b>Network rule</b>  Only HTTPS :443 is public. :8080-:8086, :1433 and :6379 stay on the private Docker network; containers resolve each other by service DNS.",
        650, 1320, 1550, 38, size=13, align="center",
    )
    d.text(
        "Target only - supporting Deployment view. Current local Docker Compose remains documented separately in 03-docker-deployment.",
        720, 1380, 1450, 30, size=12, align="center", color=MUTED,
    )
    d.save("11-cloud-docker-deployment.drawio", output_dir=ROOT / "docs" / "architecture")



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
        help="Comma-separated: c0,c1,conceptual,physical,cloud (default: all)",
    )
    args = parser.parse_args()
    selected = {part.strip().lower() for part in args.only.split(",")}
    if "all" in selected:
        selected = {"c0", "c1", "conceptual", "physical", "cloud"}

    builders = {
        "c0": build_c0,
        "c1": build_c1,
        "conceptual": build_conceptual,
        "physical": build_physical,
        "cloud": build_cloud_docker_deployment,
    }
    unknown = selected - builders.keys()
    if unknown:
        raise SystemExit(f"Unknown diagram selector(s): {sorted(unknown)}")
    for name in ("c0", "c1", "conceptual", "physical", "cloud"):
        if name in selected:
            builders[name]()
    print("Generated", ", ".join(sorted(selected)), "in", OUT)
