import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { CfnTemplate, EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import { Construct } from "constructs";
const resolve = require("path").resolve;
import fs = require("fs");

interface EmailSeviceProps extends NestedStackProps {
  applicationName: string;
  hostedZoneDomainName: string;
}

export class EmailService extends NestedStack {
  readonly mailFrom: string;

  constructor(scope: Construct, id: string, props?: EmailSeviceProps) {
    super(scope, id, props);

    const { applicationName, hostedZoneDomainName } = props!;

    const hostedZone = HostedZone.fromLookup(this, "hosted-zone", {
      domainName: hostedZoneDomainName,
    });

    const mailFromDomain = `mail.${hostedZoneDomainName}`;
    this.mailFrom = `ai-meal-planner@${mailFromDomain}`;

    const identity = new EmailIdentity(
      this,
      `${applicationName}-ses-verified-identity`,
      {
        identity: Identity.publicHostedZone(hostedZone),
        mailFromDomain,
      }
    );

    new CfnTemplate(this, "email-template", {
      template: {
        templateName: "meal-plan",
        subjectPart: "Your IA mealplan for the Week",
        htmlPart: fs.readFileSync(
          resolve("../email-templates/meal-prep.html"),
          { encoding: "utf8" }
        ),
      },
    });
  }
}
