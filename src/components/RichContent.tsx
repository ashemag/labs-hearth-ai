import { Options } from "@contentful/rich-text-react-renderer";
import { BLOCKS } from "@contentful/rich-text-types";
import { InfoTitle, SmallSpacer, Text } from "./common/InfoComponents";
import { Subtitle, Title } from "./common/Typography";

const options: Options = {
  renderMark: {},
  renderNode: {
    [BLOCKS.HEADING_1]: (node, children) => <Title>{children}</Title>,
    [BLOCKS.HEADING_2]: (node, children) => (
      <>
        <InfoTitle>{children}</InfoTitle>
        <SmallSpacer />
      </>
    ),
    [BLOCKS.HEADING_3]: (node, children) => <Subtitle>{children}</Subtitle>,
    [BLOCKS.PARAGRAPH]: (node, children) => (
      <>
        <Text>{children}</Text>
        <SmallSpacer />
      </>
    ),
    [BLOCKS.UL_LIST]: (node, children) => <ol className="list-disc pl-4">{children}</ol>,
    [BLOCKS.OL_LIST]: (node, children) => <ol className="list-decimal pl-4">{children}</ol>,
  },
};

export default options;
