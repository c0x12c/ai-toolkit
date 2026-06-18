
---

## Terraform + AWS Infrastructure

**Stack:** Terraform with AWS - EKS/ECS, RDS, ElastiCache, S3, SQS, IAM, OIDC

**Canonical templates:** [`spartan-sre-wiki`](https://github.com/spartan-stratos/spartan-sre-wiki) `templates/` is the single source for all infra scaffolds. Clone it locally (`git clone git@github.com:spartan-stratos/spartan-sre-wiki.git`) and scaffold via `templates/scaffold.sh` - never hand-author or copy a live service. Variants: [single-root](https://github.com/spartan-stratos/spartan-sre-wiki/tree/master/templates/terraform/single-root) (envs/ layout, ECS + EKS), [multiple-root](https://github.com/spartan-stratos/spartan-sre-wiki/tree/master/templates/terraform/multiple-root) (per-env/per-account), and the data-driven [service-monorepo](https://github.com/spartan-stratos/spartan-sre-wiki/tree/master/templates/service-monorepo) for EKS ArgoCD/GitOps wiring (one `deployables.yaml` source of truth). The old `template-infra-terraform-*` repos are archived and redirect here.

Rules in `rules/infrastructure/` load automatically when `.tf`, `.hcl`, or `.tfvars` files are in context (Claude Code path-scoped rules). All `/spartan:tf-*` commands also import relevant rules explicitly.

### Infrastructure Commands

| Command | Purpose |
|---|---|
| `/spartan:tf-scaffold [service]` | Scaffold service-level Terraform |
| `/spartan:tf-module [name]` | Create/extend Terraform modules |
| `/spartan:tf-review` | PR review for Terraform changes |
| `/spartan:tf-plan [env]` | Guided plan workflow |
| `/spartan:tf-deploy [env]` | Deployment checklist |
| `/spartan:tf-import [resource]` | Import existing resources |
| `/spartan:tf-drift [env]` | Detect infrastructure drift |
| `/spartan:tf-cost` | Cost estimation guidance |
| `/spartan:tf-security` | Security audit |
