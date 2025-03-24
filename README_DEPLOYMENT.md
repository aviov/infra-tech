# Deployment Guide for Infra-Tech

This document provides step-by-step instructions for deploying the infrastructure and application to Google Cloud Platform using CDKTF and Kubernetes.

## Prerequisites
- Google Cloud account with appropriate permissions
- gcloud CLI installed and configured
- kubectl installed
- Docker installed
- Node.js and npm installed

## Infrastructure Deployment

### Synthesize Terraform Configuration
```shell
cdktf synth
```

### Enable Required APIs
```shell
gcloud services enable servicenetworking.googleapis.com --project=infra-tech-454706
```

### Deploy Infrastructure
```shell
cdktf deploy
```
gcp-stack
  cluster_endpoint = 34.88.70.167
  cluster_master_version = 1.31.6-gke.1020000
  cluster_name = infra-tech-gke-cluster
  database_connection_name = infra-tech-454706:europe-north1:infra-tech-sql-instance
  database_name = infra-tech-sql-db
  sql_instance_ip = 34.88.135.82
  sql_instance_self_link =
  https://sqladmin.googleapis.com/sql/v1beta4/projects/infra-tech-454706/instances/infra-tech-sql-instance
  subnet_id = projects/infra-tech-454706/regions/europe-north1/subnetworks/infra-tech-subnet
  vpc_id = projects/infra-tech-454706/global/networks/infra-tech-vpc

## Verify Infrastructure

### List GKE clusters
```shell
gcloud container clusters list --region europe-north1
```

### Get credentials for GKE cluster
```shell
gcloud container clusters get-credentials infra-tech-gke-cluster --region europe-north1
```

### List nodes
```shell
kubectl get nodes
```

### List nodes
```shell
kubectl get nodes
```

### Get cluster info
```shell
kubectl cluster-info
```
Kubernetes control plane is running at https://34.88.70.167
GLBCDefaultBackend is running at https://34.88.70.167/api/v1/namespaces/kube-system/services/default-http-backend:http/proxy
KubeDNS is running at https://34.88.70.167/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
Metrics-server is running at https://34.88.70.167/api/v1/namespaces/kube-system/services/https:metrics-server:/proxy

### SQL Instance
```shell
gcloud sql instances list
```
NAME                     DATABASE_VERSION  LOCATION         TIER         PRIMARY_ADDRESS  PRIVATE_ADDRESS  STATUS
infra-tech-sql-instance  POSTGRES_14       europe-north1-b  db-f1-micro  34.88.135.82     -                RUNNABLE

### Get SQL Instance Private IP
```shell
gcloud sql instances describe infra-tech-sql-instance --format='value(ipAddresses[0].ipAddress)'
```

### Verify remote state of stack
```shell
gsutil ls gs://infra-tech-tfstate/terraform/state/
```

### Prepare deployment

#### Build docker image
```shell
cd ../application
docker build -t europe-north1-docker.pkg.dev/infra-tech-454706/infra-tech/sisu-tech-app:latest .
```

#### Docker config file update
```shell
gcloud auth configure-docker europe-north1-docker.pkg.dev
```

#### Push docker image
```shell
docker push europe-north1-docker.pkg.dev/infra-tech-454706/infra-tech/sisu-tech-app:latest
```

#### Prepare deployment action
Match the image name in the deployment.yaml file with the image name in the docker image.

Apply the deployment.yaml file
```shell
kubectl apply -f ./kubernetes/deployment.yaml
```

#### Get svc external IP
```shell
kubectl get svc express-service
```

### Deploy to GKE

