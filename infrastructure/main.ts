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

class MyGcpStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // // Cloud Storage backend if using Terraform Cloud
    // new CloudBackend(this, {
    //   hostname: "app.terraform.io",
    //   organization: "org-name",
    //   workspaces: new NamedCloudWorkspace("infra-tech"),
    // });

    // Google Provider
    new GoogleProvider(this, "google", {
      project: "infra-tech-454706",
      region: "europe-north1",
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
      region: "europe-north1",
      privateIpGoogleAccess: true,
    });

    // GKE
    const cluster = new ContainerCluster(this, "gke-cluster", {
      name: "infra-tech-gke-cluster",
      location: "europe-north1",
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
      region: "europe-north1",
      settings: {
        tier: "db-f1-micro",
        ipConfiguration: {
          privateNetwork: vpc.id,
          authorizedNetworks: [{ value: "0.0.0.0/0", name: "public-https" }],
        },
      },
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

// GCS backend config
stack.addOverride("terraform.backend", {
  gcs: {
    bucket: "infra-tech-tfstate",
    prefix: "terraform/state",
  },
});

app.synth();
