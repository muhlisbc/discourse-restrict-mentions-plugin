import { withPluginApi } from "discourse/lib/plugin-api";
import discourseComputed, {
  bind
} from "discourse-common/utils/decorators";
import userSearch from "discourse/lib/user-search";

const PLUGIN_ID = "restrict-mentions";

function initWithApi(api) {
  const siteSettings = api.container.lookup("site-settings:main");

  if (!siteSettings.restrict_mentions_enabled) return;

  api.modifyClass("model:group", {
    pluginId: PLUGIN_ID,

    asJSON() {
      const attrs = this._super(...arguments);

      attrs["c_allowed_mention_groups"] = this.c_allowed_mention_groups;

      return attrs;
    },

    @discourseComputed("c_allowed_mention_groups")
    cAllowedMentionGroups(groups) {
      return (groups || "").split("|");
    }
  });

  api.modifyClass("component:composer-editor", {
    pluginId: PLUGIN_ID,
    @bind
    _userSearchTerm(term) {
      if (!this.siteSettings.restrict_mentions_enabled) {
        return this._super(...arguments);
      }

      let viewGroups = true;

      let allowed =
        this.get("topic.c_allowed_mention_groups") ||
        this.currentUser.get("c_allowed_mention_groups");

      if (Ember.isBlank(allowed)) {
        return;
      }

      //REMOVING CUSTOMER GROUP FROM SEARCHABLE ARRAY OF STANDARD USERS
      if(!this.currentUser.staff){
        viewGroups = false;
        const array = allowed;
        const index = array.indexOf('ATLAS_Customers');
        if (index > -1) {
          array.splice(index, 1);
        }
        allowed = array;
      }

      const opts = {
        term,
        includeGroups: viewGroups,
        groupMembersOf: allowed
      };

      return userSearch(opts);
    }
  });
}

export default {
  name: "restrict-mentions",

  initialize() {
    withPluginApi("0.8.7", initWithApi);
  }
};
