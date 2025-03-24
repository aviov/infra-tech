import { Construct } from "constructs";
import {
  App,
  TerraformStack,
  // CloudBackend,
  // NamedCloudWorkspace
} from "cdktf";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { ComputeNetwork } from "@cdktf/provider-google/lib/compute-network";
import { ComputeSubnetwork } from "@cdktf/provider-google/lib/compute-subnetwork";
import { ContainerCluster } from "@cdktf/provider-google/lib/container-cluster";
import { SqlDatabaseInstance } from "@cdktf/provider-google/lib/sql-database-instance";
import { SqlDatabase } from "@cdktf/provider-google/lib/sql-database";
import { SqlUser } from "@cdktf/provider-google/lib/sql-user";
import { TerraformOutput } from "cdktf";
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

class MyGcpStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // // Cloud Storage backend if using Terraform Cloud
    // new CloudBackend(this, {
    //   hostname: "app.terraform.io",
    //   organization: "org-name",
    //   workspaces: new NamedCloudWorkspace("infra-tech"),
    // });

    const projectId = process.env.GCP_PROJECT_ID || "infra-tech-454706";
    const region = process.env.GCP_REGION || "europe-north1";

    // Google Provider
    new GoogleProvider(this, "google", {
      project: projectId,
      region: region,
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ? require('fs').readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8') : undefined,
    });

    // VPC and Subnet
    const vpc = new ComputeNetwork(this, "vpc", {
      name: "infra-tech-vpc",
      autoCreateSubnetworks: false,
    });

    const subnet = new ComputeSubnetwork(this, "subnet", {
      name: "infra-tech-subnet",
      ipCidrRange: "10.0.0.0/16",
      network: vpc.id,
      region: region,
      privateIpGoogleAccess: true,
    });

    // GKE
    const cluster = new ContainerCluster(this, "gke-cluster", {
      name: "infra-tech-gke-cluster",
      location: region,
      network: vpc.id,
      subnetwork: subnet.id,
      initialNodeCount: 1,
      nodeConfig: {
        machineType: "e2-small",
        oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
      },
      ipAllocationPolicy: {},
      privateClusterConfig: {
        enablePrivateNodes: true,
        enablePrivateEndpoint: false,
        masterIpv4CidrBlock: "172.16.0.0/28",
      },
      masterAuthorizedNetworksConfig: {
        cidrBlocks: [
          { cidrBlock: "10.26.32.12/32", displayName: "vpn-1" },
          { cidrBlock: "19.104.105.29/32", displayName: "vpn-2" },
          { cidrBlock: "0.0.0.0/0", displayName: "public-https" },
        ],
      },
    });

    // PostgreSQL instance
    const sqlInstance = new SqlDatabaseInstance(this, "sql-instance", {
      name: "infra-tech-sql-instance",
      databaseVersion: "POSTGRES_14",
      region: region,
      settings: {
        tier: "db-f1-micro",
        ipConfiguration: {
          ipv4Enabled: true,
          authorizedNetworks: [
            { 
              value: "0.0.0.0/0",  // For development, restrict this to specific IPs in production
              name: "public-https" 
            }
          ],
        },
      },
      deletionProtection: false,
    });

    // PostgreSQL db
    const sqlDatabase = new SqlDatabase(this, "sql-db", {
      name: "infra-tech-sql-db",
      instance: sqlInstance.name,
    });

    // PostgreSQL user
    new SqlUser(this, "infra-tech-sql-user", {
      name: "appuser",
      instance: sqlInstance.name,
      password: "angKlw-287tgs-Po1-287",
    });

    // Outputs
    new TerraformOutput(this, "vpc_id", {
      value: vpc.id,
      description: "VPC ID",
    });
    
    new TerraformOutput(this, "subnet_id", {
      value: subnet.id,
      description: "Subnet ID",
    });

    new TerraformOutput(this, "cluster_name", {
      value: cluster.name,
      description: "GKE cluster name",
    });
    
    new TerraformOutput(this, "cluster_master_version", {
      value: cluster.masterVersion,
      description: "GKE Kubernetes version",
    });

    new TerraformOutput(this, "cluster_endpoint", {
      value: cluster.endpoint,
      description: "GKE cluster endpoint",
    });
    
    new TerraformOutput(this, "database_connection_name", {
      value: sqlInstance.connectionName,
      description: "SQL instance name",
      sensitive: false,
    });

    new TerraformOutput(this, "database_name", {
      value: sqlDatabase.name,
      description: "PostgreSQL database name",
    });
    
    new TerraformOutput(this, "sql_instance_ip", {
      value: sqlInstance.firstIpAddress,
      description: "PostgreSQL instance IP address",
    });

    new TerraformOutput(this, "sql_instance_self_link", {
      value: sqlInstance.selfLink,
      description: "SQL instance self link",
    });
  }
}

const app = new App();
const stack = new MyGcpStack(app, "gcp-stack");

// // GCS backend config
// stack.addOverride("terraform.backend", {
//   gcs: {
//     bucket: "infra-tech-tfstate",
//     prefix: "terraform/state",
//   },
// });
// Use local backend during development
stack.addOverride("terraform.backend", {
  local: {
    path: "./terraform.tfstate",
  },
});

app.synth();
