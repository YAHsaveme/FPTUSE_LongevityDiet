# Skill - BMAD Assignment Foundation

## Purpose
Use BMAD-style idea clarification and validation to keep the PRN232 Assignment documentation specific, internally consistent, and grounded in the existing Longevity Diet Companion project.

## Source priority
1. PRN232 Final Assignment PDF - mandatory course requirements.
2. Current repository code and docker-compose.yml - implemented runtime truth.
3. Project requirements, ADRs, roadmap and safety docs - agreed target MVP.
4. Official C4 model guidance - architecture abstraction/notation.
5. The supplied architecture reference image - visual composition only, never a source for features that do not exist in this project.

## BMAD rules applied
- Start from the actual situation, not from a preferred pattern.
- Existing project files are the source of truth for an existing project.
- Remove fuzzy wording: distinguish Guest, Member, Administrator, Worker, and external software systems.
- Pressure-test the central claims before documenting them.
- Record rejected options and why they were rejected when the choice affects architecture.
- Keep planning context concise enough to hand off to requirements/architecture work.

## Assignment foundation order
1. Context
2. Problems
3. Solutions
4. Main Actors
5. Main Features
6. System Architecture (C0 System Context + C1 Container)
7. Technology
8. Conceptual ERD
9. Physical Database
10. PRN232 requirement coverage, deliverables and demo evidence

## Anti-invention guardrail
Do not copy sample-image elements such as Mobile App, Cloudinary, Brevo, RabbitMQ, or Google AI unless the actual LDC project adopts them. The sample is a layout reference, not the product specification.
