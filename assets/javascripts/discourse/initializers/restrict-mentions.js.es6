import { withPluginApi } from "discourse/lib/plugin-api";
import discourseComputed from "discourse-common/utils/decorators";
import userSearch from "discourse/lib/user-search";

function initWithApi(api) {
  if (!Discourse.SiteSettings.restrict_mentions_enabled) return;

  api.modifyClass("component:groups-form-interaction-fields", {
    pluginId: 'groups-form-interaction-fields-plugin',
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
    pluginId: 'group-plugin',
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
    pluginId: 'composer-editor-plugin',
    userSearchTerm(term) {
      if (!this.siteSettings.restrict_mentions_enabled) {
        return this._super(...arguments);
      }

      let viewGroups = true;

      const allowed =
        this.get("topic.c_allowed_mention_groups") ||
        this.currentUser.get("c_allowed_mention_groups");

      console.log([this, allowed]);

      if (Ember.isBlank(allowed)) {
        return;
      }

      //REMOVING CUSTOMER GROUP FROM SEARCHABLE ARRAY OF STANDARD USERS
      if(!this.currentUser.admin && !this.currentUser.moderator){
        viewGroups = false;
        const index = allowed.indexOf('ATLAS_Customers');

        if (index > -1) {
          allowed.splice(index, 1);
        }
        console.log(allowed)
      }

      // const topicId = this.get("topic.id");
      // const categoryId =
      //   this.get("topic.category_id") || this.get("composer.categoryId");

      const opts = {
        term,
        // topicId,
        // categoryId,
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
    withPluginApi("0.8", initWithApi);
  }
};
