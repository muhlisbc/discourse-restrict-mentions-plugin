import discourseComputed from "discourse-common/utils/decorators";

export default Ember.Component.extend({
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
      let newVal;

      if (val.includes("any")) {
        newVal = "any";
      } else {
        newVal = val.filter(x => !Ember.isBlank(x)).join("|");
      }

      this.model.set("c_allowed_mention_groups", newVal);
    }
  }
});
