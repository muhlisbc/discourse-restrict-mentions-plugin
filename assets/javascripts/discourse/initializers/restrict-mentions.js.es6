import { withPluginApi } from "discourse/lib/plugin-api";
import discourseComputed, {
  on
} from "discourse-common/utils/decorators";
import userSearch from "discourse/lib/user-search";

const PLUGIN_ID = "discourse-shared-edits";

function initWithApi(api) {
  if (!Discourse.SiteSettings.restrict_mentions_enabled) return;

  api.modifyClass("component:groups-form-interaction-fields", {
    pluginId: PLUGIN_ID,
    @discourseComputed(
      "siteSettings.restrict_mentions_enabled",
      "currentUser.admin",
      "model.c_all_groups",
      "model.name"
    )
    isShowRestrictMentions(enabled, admin, allGroups, name) {
      return enabled && admin && allGroups && name && allGroups.includes(name);
    },

    @discourseComputed("model.c_all_groups", "model.name")
    cSelectableGroups(allGroups, name) {
      return (allGroups || []).filter(g => g !== name);
    },

    actions: {
      setCAllowedMentionGroups(val) {
        console.log(val);

        let newVal;

        if (val.includes("any")) {
          newVal = "any";
        } else {
          newVal = val.filter(x => !Ember.isBlank(x)).join("|");
        }

        console.log(newVal)

        this.model.set("c_allowed_mention_groups", newVal);
      }
    }
  });

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
    @on("keyDown")
    _trackTyping() {
      let viewGroups = true;

      let allowed = this.currentUser.c_allowed_mention_groups;

      //REMOVING CUSTOMER GROUP FROM SEARCHABLE ARRAY OF STANDARD USERS
      if(!this.currentUser.admin && !this.currentUser.moderator){
        viewGroups = false;
        const array = allowed;
        const index = array.indexOf('ATLAS_Customers');
        if (index > -1) {
          array.splice(index, 1);
        }
        allowed = array;
      }

      const opts = {
        includeGroups: viewGroups,
        groupMembersOf: allowed
      };

      console.log(opts)

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
