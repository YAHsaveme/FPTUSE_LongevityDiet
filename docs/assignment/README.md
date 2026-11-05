# PRN232 Final Assignment — LongevityDiet

Start with the [course requirements and evidence](00-ASSIGNMENT-DOCUMENT.md).

## Deliverables (small student-project scope)

[One-page Draw.io diagrams and editable DBML](one-page/README.md):
C0 context, C1 containers, C2 REST API components and the core ten-table ERD.

To follow **every request, return and asynchronous result**, open the
[single-page runtime sequence](one-page/05-runtime-end-to-end.drawio).
It has 10 ordered REST/gRPC steps and 19 ordered Redis/Worker/notification steps.
This is a companion sequence diagram, not a replacement for C0/C1/C2.

## Reading order

1. [Assignment summary](00-ASSIGNMENT-DOCUMENT.md)
2. [C4 structure and scope](02-SYSTEM-ARCHITECTURE-C4.md)
3. [Core database model](03-DATA-MODEL.md)
4. [Actual connections, test evidence and remaining limits](04-RUNTIME-CONNECTIVITY.md)
5. [Six editable Draw.io diagrams and one-page PDFs](one-page/README.md)
6. [Deployment and supplementary runtime views](../architecture/README.md)

The PDF rubric does not require six REST microservices, six databases or a
separate gateway. The existing EF migrations and source code remain
authoritative for the actual schema. Old target-architecture atlases have
verified backups and are not included in the student handout.
