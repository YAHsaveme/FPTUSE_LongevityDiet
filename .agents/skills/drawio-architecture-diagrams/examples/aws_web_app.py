"""Worked example: a web application on AWS, existing and proposed variants on two tabs.

Shows the patterns the skill recommends:
  * a grid decided up front: nested containers (cloud, region, VPC, subnet rows), then boxes
  * a corridor reserved on the right for the long CloudFront to S3 run, so it crosses no box
  * bus bars (ALB target group, task egress) instead of many converging lines
  * labels as separate text cells placed beside lines, never on borders or titles
  * line style carries meaning (thick internet, solid internal, dotted replication, dashed third party)
  * box style carries meaning (grey key service, heavy boundary objects, cylinders for stores, dashed externals)
  * an arrow that leaves the frame through an invisible anchor, ready to join a larger drawing
  * the proposal is marked "(proposed)" in its title

Run:  python3 aws_web_app.py out.drawio
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
from drawio_writer import Page, save


def web_app(pid, name, title, proposed):
    p = Page(name, 1300, 1290, pid=pid)
    p.title(title, 100, 14, 700, 32)

    # outside the cloud: users on top
    p.box("users", 410, 64, 160, 50, "Users", "ext")

    p.zone("cloud", 100, 150, 1160, 860, "AWS Cloud")

    # edge row
    p.zone("edge", 120, 190, 1120, 100, "Edge", "sub")
    p.box("r53", 140, 225, 150, 50, "Route 53")
    p.box("cf", 410, 225, 160, 50, "CloudFront")
    p.box("waf", 610, 225, 140, 50, "AWS WAF")
    p.link("users_r53", "users", "r53", (410, 89), (215, 225), points=[(215, 89)])
    p.text("l_dns", 223, 120, 40, 22, "DNS")
    p.link("users_cf", "users", "cf", (490, 114), (490, 225), kind="thick", arrow="end")
    p.text("l_https1", 498, 120, 50, 22, "HTTPS")
    p.link("cf_waf", "cf", "waf", (570, 250), (610, 250))

    p.zone("region", 120, 320, 1120, 670, "Region eu-west-1", "sub")
    p.zone("vpc", 140, 360, 680, 610, "VPC 10.0.0.0/16")

    # public subnets: boundary objects get the heavy style
    p.zone("pub", 160, 400, 640, 110, "Public subnets", "sub")
    p.box("vpn", 180, 440, 160, 50, "VPN gateway", "heavy")
    p.box("alb", 380, 440, 220, 50, "Application Load Balancer", "heavy")
    p.link("cf_alb", "cf", "alb", (490, 275), (490, 440), kind="thick", arrow="end")
    p.text("l_https2", 498, 330, 50, 22, "HTTPS")

    # loose end: the VPN continues into the office network drawing
    p.anchor("office", 20, 465)
    p.link("vpn_office", "vpn", "office", (180, 465), (20, 465), kind="thick", arrow="end")
    p.text("l_office", 24, 432, 72, 26, "to office")

    # app subnets: one bus bar in (target group), one bus bar out (egress)
    p.zone("app", 160, 550, 640, 150, "App subnets", "sub")
    p.box("tg", 236, 585, 468, 4, "", "bar")
    p.link("alb_tg", "alb", "tg", (490, 490), (490, 585))
    p.text("l_tg", 498, 517, 90, 24, "target group")
    p.box("out", 236, 688, 468, 4, "", "bar")
    for i, (x, az) in enumerate([(180, "a"), (320, "a"), (500, "b"), (640, "b")], 1):
        p.box(f"task{i}", x, 610, 120, 60, f"API task<br>AZ {az}", "key")
        p.link(f"tg_task{i}", "tg", f"task{i}", (x + 60, 589), (x + 60, 610))
        p.link(f"task{i}_out", f"task{i}", "out", (x + 60, 670), (x + 60, 688))

    # data subnets
    p.zone("data", 160, 740, 640, 210, "Data subnets", "sub")
    p.box("db", 200, 790, 160, 80, "RDS PostgreSQL<br>primary, AZ a", "store")
    p.link("out_db", "out", "db", (280, 692), (280, 790))
    p.text("l_sql", 288, 708, 40, 24, "SQL")
    if proposed:
        p.box("cache", 410, 790, 140, 80, "ElastiCache<br>Redis", "store")
        p.link("out_cache", "out", "cache", (480, 692), (480, 790))
        p.text("l_cache", 488, 708, 50, 24, "cache")
        p.box("db2", 600, 790, 160, 80, "RDS PostgreSQL<br>standby, AZ b", "store")
        p.link("db_db2", "db", "db2", (320, 870), (720, 870), points=[(320, 905), (720, 905)], kind="dotted")
        p.text("l_repl", 460, 912, 130, 22, "sync replication")

    # regional services outside the VPC; x=1170 is a reserved corridor
    p.box("cw", 900, 420, 220, 60, "CloudWatch<br>logs, metrics")
    p.box("s3", 900, 600, 220, 80, "S3<br>static assets, uploads", "store")
    p.link("task4_s3", "task4", "s3", (760, 640), (900, 640))
    p.text("l_vpce", 828, 614, 66, 22, "endpoint")
    p.link("cf_s3", "cf", "s3", (550, 275), (1120, 640), points=[(550, 305), (1170, 305), (1170, 640)])
    p.text("l_origin", 1176, 450, 56, 22, "origin")
    p.box("sqs", 900, 740, 220, 60, "SQS<br>job queue")
    p.link("out_sqs", "out", "sqs", (704, 690), (900, 770), points=[(860, 690), (860, 770)])
    p.text("l_jobs", 866, 716, 32, 22, "jobs")
    p.box("fn", 900, 850, 220, 60, "Lambda<br>payment worker")
    p.link("sqs_fn", "sqs", "fn", (1010, 800), (1010, 850))
    p.text("l_trigger", 1018, 814, 60, 22, "trigger")

    # third party, outside the cloud
    p.box("psp", 900, 1050, 220, 50, "Payment provider API", "ext")
    p.link("fn_psp", "fn", "psp", (1010, 910), (1010, 1050), kind="dashed")
    p.text("l_https3", 1018, 1018, 50, 22, "HTTPS")

    # legend outside the frame so it can be dropped when pasting into a bigger drawing
    rows = [("thick", "internet traffic", "end"), ("data", "internal traffic")]
    if proposed:
        rows.append(("dotted", "database replication"))
    rows.append(("dashed", "third-party service"))
    p.legend("lg", 100, 1130, 360, rows)
    return p


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "aws_web_app.drawio"
    pages = [web_app("ex", "Existing", "Web application on AWS (existing)", False),
             web_app("pr", "Proposed", "Web application with cache and standby (proposed)", True)]
    bad = False
    for pg in pages:
        for w in pg.lint():
            bad = True
            print(f"LINT [{pg.name}] {w}")
    save(out, pages)
    print("wrote", out, "(lint clean)" if not bad else "(fix lint warnings above)")
