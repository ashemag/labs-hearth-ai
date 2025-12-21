import { Template, InfoTitle, SmallSpacer, Text, Bullets, Spacer } from "@/components/common/InfoComponents";

export const metadata = {
  title: "Security",
  description: "Learn more about Hearth's security and best practices",
};

const Security = async () => {
  const articleData = {
    icon: "/icons/security_icon.png",
    title: "Security",
    createDate: "June 1st, 2023",
    author: "Data Security",
  };

  return (
    <>
      <Template articleData={articleData}>
        <InfoTitle>Why we collect your data</InfoTitle>
        <SmallSpacer />
        <Text>
          We collect your data for the purpose of providing you with a high-quality product and user experience.
        </Text>

        <Spacer />
        <InfoTitle>{`What we’re collecting`}</InfoTitle>
        <SmallSpacer />
        <Text>
          {`The information we collect depends on the Hearth features you want to use.
        If you choose to grant access, we can collect personal information such as:`}
        </Text>
        <Bullets
          list={[
            `Your email address, when you register for our services or express an interest
           in obtaining information about us or our products and services`,
            `Your calendar events and meetings`,
            `Your contact data`,
          ]}
        />
        <Text>
          {`No information will be collected without your explicit permission,
        which we will ask you for during your onboarding process. We believe
        having your meeting and contact information will provide you with a
        more enriched Hearth experience.`}
        </Text>
        <SmallSpacer />
        {`Access to these sets of data allows us to do the following things:`}
        <Bullets
          list={[
            `Provide more accurate briefings on the people you are meeting with`,
            `Provide supplemental context on the people in your network and your most recent
      interactions with them`,
          ]}
        />
        <InfoTitle>No resale of data</InfoTitle>
        <SmallSpacer />
        <Text>{`‍Hearth is committed to protecting your privacy, and we will never sell your personal
       information to third parties. We may receive supplemental information from public databases,
       marketing partners, social media platforms, and other outside sources that you have already
       consented to sharing via the privacy settings on those platforms. This information is and
       will solely be used to enhance our services and capabilities.`}</Text>

        <Spacer />
        <InfoTitle>{`Deletion of data`}</InfoTitle>
        <SmallSpacer />
        <Text>
          <>
            {`You always have the option to have your data removed from our system.
        If you would like your data to be deleted please reach out to `}
            <a href="mailto:hello@hearth.ai" className="font-bold">
              hello@hearth.ai.
            </a>
          </>
        </Text>

        <Spacer />
        <InfoTitle>{`Your data is safe with us`}</InfoTitle>
        <SmallSpacer />
        <Text>
          {`Your data privacy and security is of the utmost importance to us
        and core to how we operate. We believe AI should augment the human
        experience and that starts with building trust with you by ensuring
        that your data is securely protected. We are committed to safeguarding your data.
        This means we have taken all necessary steps to protect the confidentiality of our users'
        information by implementing rigorous organizational and technical processes and procedures
         as well as additional security measures to ensure the safety of your data. That being said,
          our systems are not magical–we hope that you are accessing our products and services sensibly.`}
        </Text>
      </Template>
      <div className="bg-gradient" />
    </>
  );
};

export default Security;
