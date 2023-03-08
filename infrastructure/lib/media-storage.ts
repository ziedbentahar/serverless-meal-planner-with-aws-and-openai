import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import {
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { CanonicalUserPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  IBucket,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface MediaStorageProps extends NestedStackProps {
  applicationName: string;
}

export class MediaStorage extends NestedStack {
  mediaUrl: string;
  bucket: IBucket;

  constructor(scope: Construct, id: string, props?: MediaStorageProps) {
    super(scope, id, props);

    const { applicationName } = props!;

    this.bucket = new Bucket(this, `${applicationName}-media-storage`, {
      bucketName: `${applicationName}-media-storage`,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: BucketAccessControl.PRIVATE,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
    });

    const originAccessIdentity = new OriginAccessIdentity(
      this,
      "origin-access-identity"
    );

    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("*")],
        principals: [
          new CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    const origin = new S3Origin(this.bucket, {
      originAccessIdentity,
    });

    const cloudfrontDistribution = new Distribution(
      this,
      "cloud-front-distribution",
      {
        defaultBehavior: {
          origin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        additionalBehaviors: {
          ["images/*"]: {
            origin,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          },
        },
      }
    );

    this.mediaUrl = `https://${cloudfrontDistribution.distributionDomainName}/images`;
  }
}
