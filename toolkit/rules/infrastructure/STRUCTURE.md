---
paths:
  - "**/*.tf"
  - "**/*.hcl"
  - "**/*.tfvars"
---
# Project Organization and Layering

> Full guide: use `/spartan:tf-scaffold` command

> **Canonical templates:** [`spartan-sre-wiki`](https://github.com/spartan-stratos/spartan-sre-wiki)
> `templates/` is the single source for all infra scaffolds. Clone it locally and
> scaffold via `templates/scaffold.sh`; do not hand-author or copy a live service.
> The old `template-infra-terraform-*` repos are archived and redirect here. For an
> EKS service's ArgoCD/GitOps wiring use the data-driven `templates/service-monorepo/`.

## Two Template Variants

### Multi-Root (v1)

Separate root modules per environment. Best for multi-account setups.

Reference: [`spartan-sre-wiki` / templates/terraform/multiple-root](https://github.com/spartan-stratos/spartan-sre-wiki/tree/master/templates/terraform/multiple-root)

```
infra-terraform/
├── bootstrap/              # Foundational (S3 bucket, OIDC, Route53, SSM)
├── config/                 # Shared config modules (aws, general, github)
└── live/
    ├── shared/             # Reusable module compositions
    │   ├── ecr/
    │   ├── rds/
    │   └── redis/
    ├── dev/                # Dev root module
    │   ├── terraform.tf
    │   ├── provider.tf
    │   ├── variables.tf
    │   ├── locals.tf
    │   └── main.tf
    └── prod/               # Prod root module
        └── ...
```

### Single-Root (v2)

One root module with per-environment variable files. Supports both ECS and EKS. Best for simpler setups.

Reference: [`spartan-sre-wiki` / templates/terraform/single-root](https://github.com/spartan-stratos/spartan-sre-wiki/tree/master/templates/terraform/single-root)

```
infra-terraform/
├── bootstrap/
├── config/
│   ├── aws/
│   ├── general/
│   ├── github/
│   └── eks/                # or ecs/
└── live/
    ├── terraform.tf
    ├── provider.tf
    ├── variables.tf
    ├── locals.tf
    ├── config.tf           # Config module references
    ├── data.tf             # Remote state references
    └── envs/
        ├── dev/
        │   ├── state.config
        │   ├── terraform.tfvars
        │   └── secrets.tfvars
        └── prod/
            └── ...
```

---

## 3-Tier Architecture

All platform infrastructure follows a strict 3-tier dependency chain:

1. **bootstrap/** -- Foundational resources. Manual admin setup, local or S3 backend.
   - S3 state bucket, OIDC roles, Route53 zones, SSM parameters

2. **config/** -- Centralized config modules (aws, general, github, eks/ecs, slack, datadog). Imported by both bootstrap and live layers. DRY constants.

3. **live/** -- Active infrastructure. Contains shared modules (multi-root) or flat orchestration (single-root). Reads bootstrap outputs via `terraform_remote_state`.

---

## Service-Level Terraform

Service infrastructure lives in the **service repo**, not the infra-terraform repo.

```
{service}-repo/
└── terraform/
    ├── live/
    │   ├── terraform.tf
    │   ├── provider.tf
    │   ├── variables.tf
    │   ├── locals.tf
    │   ├── data.tf         # Remote state from infra-terraform
    │   └── main.tf         # Module call to modules/{service}
    ├── modules/
    │   └── {service}/
    │       ├── variables.tf
    │       ├── outputs.tf
    │       ├── locals.tf
    │       ├── ecr.tf
    │       ├── rds.tf
    │       ├── redis.tf
    │       ├── s3.tf
    │       ├── eks.tf
    │       └── sqs.tf
    └── envs/
        ├── dev/
        │   ├── state.config
        │   ├── terraform.tfvars
        │   └── secrets.tfvars
        └── prod/
            └── ...
```

---

## File Conventions

Every directory follows these file conventions. Do not combine purposes into one file.

| File | Purpose |
|------|---------|
| `terraform.tf` | Backend config, `required_providers`, `required_version` |
| `variables.tf` | Input variable declarations |
| `locals.tf` | ALL `locals {}` blocks -- never scattered across files |
| `outputs.tf` | Module/layer outputs |
| `config.tf` | Config module references |
| `provider.tf` | Provider configurations (live layer only) |
| `data.tf` | Data sources and remote state references |

---

## Anti-Patterns

### WRONG -- Flat structure with all resources in root

```hcl
# Everything dumped in one directory, no layering
main.tf          # 500+ lines: VPC, RDS, Redis, EKS, ECR, S3, IAM...
variables.tf     # 200+ variables for everything
```

### CORRECT -- Layered separation

```hcl
# bootstrap/ handles foundational resources
# config/ centralizes constants
# live/ orchestrates via module calls
# Each module has one resource type per file
```

### WRONG -- Mixing bootstrap and live in one state

```hcl
# S3 state bucket and application RDS in the same terraform state
resource "aws_s3_bucket" "tf_state" { ... }  # Bootstrap resource
resource "aws_db_instance" "app" { ... }      # Live resource
```

### CORRECT -- Separate state files per tier

```hcl
# bootstrap/terraform.tf
terraform {
  backend "s3" {
    key = "bootstrap.tfstate"
  }
}

# live/terraform.tf
terraform {
  backend "s3" {
    key = "live-dev.tfstate"
  }
}
```

### WRONG -- Service infrastructure in infra-terraform repo

```hcl
# infra-terraform/live/dev/service-api.tf
module "service_api_rds" { ... }
module "service_api_ecr" { ... }
```

### CORRECT -- Service Terraform in service repo, consuming infra remote state

```hcl
# {service}-repo/terraform/live/data.tf
data "terraform_remote_state" "infra" {
  backend = "s3"
  config = {
    bucket = var.infra_state_bucket
    key    = var.infra_state_key
    region = var.aws_region
  }
}
```

### WRONG -- Locals scattered across files

```hcl
# rds.tf
locals { db_name = "mydb" }

# redis.tf
locals { redis_name = "myredis" }
```

### CORRECT -- All locals in locals.tf

```hcl
# locals.tf
locals {
  db_name    = "mydb"
  redis_name = "myredis"
}
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| Template choice | Multi-root for multi-account, single-root for simple setups |
| Tiers | bootstrap -> config -> live (strict dependency chain) |
| Service infra | In service repo, not infra-terraform |
| File per resource | One resource type per `.tf` file in modules |
| Locals | ALL in `locals.tf`, never scattered |
| Providers | Only in `live/` layer |
| Environment config | `envs/{env}/` with state.config, terraform.tfvars, secrets.tfvars |