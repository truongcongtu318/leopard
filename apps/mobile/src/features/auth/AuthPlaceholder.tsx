import { Text } from "react-native";
import { roles } from "@leopard/shared";

import { FoundationCard } from "../../components/FoundationCard";
import { textStyles } from "../../theme";

export function AuthPlaceholder() {
  return (
    <FoundationCard
      title="Auth placeholder"
      caption="Login logic starts in Phase 2.3 after the Auth API is available."
    >
      <Text style={textStyles.meta}>Shared roles: {roles.join(", ")}</Text>
    </FoundationCard>
  );
}
