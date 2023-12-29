import { StackProps } from "aws-cdk-lib";

interface ICoreStackProps extends StackProps {
  project: string;
  stage: string;
  tags?: {
    [key: string]: string;
  }
}


const coreStackProps: ICoreStackProps = {
  project: process.env.PROJECT || "FoundryVtt",
  stage: process.env.STAGE || "Dev",
};


export {
  coreStackProps,
  ICoreStackProps
}