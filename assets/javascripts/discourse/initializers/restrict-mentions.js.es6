import { withPluginApi } from "discourse/lib/plugin-api";
import discourseComputed, {
  on
} from "discourse-common/utils/decorators";
import userSearch from "discourse/lib/user-search";
import { findRawTemplate } from "discourse-common/lib/raw-templates";
import putCursorAtEnd from "discourse/lib/put-cursor-at-end";
import {
  caretPosition,
  // formatUsername,
  inCodeBlock,
  // tinyAvatar,
} from "discourse/lib/utilities";

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

    @on("didInsertElement")
    _composerEditorInit() {
      if (!this.siteSettings.restrict_mentions_enabled) {
        return this._super(...arguments);
      }

      let viewGroups = true;
      let allowed =
        this.get("topic.c_allowed_mention_groups") ||
        this.currentUser.get("c_allowed_mention_groups") ||
        [];

      //REMOVING CUSTOMER GROUP FROM SEARCHABLE ARRAY OF STANDARD USERS
      if (!this.currentUser.staff) {
        viewGroups = false;

        const array = allowed;
        const index = array.indexOf("ATLAS_Customers");
        if (index > -1) array.splice(index, 1);

        allowed = array;
      }

      const $input = $(this.element.querySelector(".d-editor-input"));

      if (this.siteSettings.enable_mentions) {
        $input.autocomplete({
          template: findRawTemplate("user-selector-autocomplete"),
          dataSource: (term) =>
            userSearch({
              term,
              includeGroups: viewGroups,
              groupMembersOf: allowed
            }),
          key: "@",
          transformComplete: (v) => v.username || v.name,
          afterComplete: this._afterMentionComplete,
          triggerRule: (textarea) =>
            !inCodeBlock(textarea.value, caretPosition(textarea)),
        });
      }

      this.element
        .querySelector(".d-editor-input")
        ?.addEventListener("scroll", this._throttledSyncEditorAndPreviewScroll);

      // Focus on the body unless we have a title
      if (!this.get("composer.canEditTitle")) {
        putCursorAtEnd(this.element.querySelector(".d-editor-input"));
      }

      if (this.allowUpload) {
        this._bindUploadTarget();
        this._bindMobileUploadButton();
      }

      this.appEvents.trigger(`${this.composerEventPrefix}:will-open`);
    }
  });
}

export default {
  name: "restrict-mentions",

  initialize() {
    withPluginApi("0.8.7", initWithApi);
  }
};
