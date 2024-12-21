# name: restrict-mentions
# version: 0.4.0
# authors: Muhlis Budi Cahyono (muhlisbc@gmail.com)
# url: https://github.com/muhlisbc/discourse-restrict-mentions-plugin

enabled_site_setting :restrict_mentions_enabled

after_initialize do
  class ::User
    def c_allowed_mention_groups
      allowed = []

      groups.c_groups.each do |group|
        allowed << group.name

        gs = group.c_allowed_mention_groups

        next if gs.blank?

        query = Group.c_groups

        if gs == 'any'
          query.pluck(:name).each do |g|
            allowed << g
          end
        else
          query.where(name: gs.split('|')).each do |g|
            allowed << g.name
          end
        end
      end

      allowed.uniq
    end
  end

  class ::Group
    def c_allowed_mention_groups=(val)
      custom_fields['allowed_mention_groups'] = val
    end

    def c_allowed_mention_groups
      custom_fields['allowed_mention_groups'].to_s
    end

    scope :c_groups, -> do
      excluded = 0.upto(4).map { |n| "trust_level_#{n}" }
      excluded << 'everyone'

      where.not(name: excluded)
    end
  end

  add_to_serializer(:group_show, :c_all_groups) do
    val = Group.c_groups.pluck(:name)
    val.unshift('any')

    val
  end

  add_to_serializer(:group_show, :c_allowed_mention_groups) do
    object.c_allowed_mention_groups
  end

  class ::GroupsController
    alias_method :orig_group_params, :group_params

    def group_params(automatic: false)
      permitted = orig_group_params(automatic: automatic)
      val = params.require(:group).permit(:c_allowed_mention_groups)
      val = val[:c_allowed_mention_groups]

      if current_user.admin && val
        permitted[:c_allowed_mention_groups] = val
      end

      permitted
    end
  end

  add_to_serializer(:current_user, :c_allowed_mention_groups) do
    scope.user&.c_allowed_mention_groups
  end

  add_to_serializer(:topic_view, :c_allowed_mention_groups) do
    scope.user&.c_allowed_mention_groups
  end

  module ::UserSearchExt
    def initialize(term, opts = {})
      if !SiteSetting.restrict_mentions_enabled
        return super(term, opts)
      end

      @term = term
      @term_like = "#{term.downcase.gsub("_", "\\_")}%"
      @topic_id = opts[:topic_id]
      @category_id = opts[:category_id]
      @topic_allowed_users = opts[:topic_allowed_users]
      @searching_user = opts[:searching_user]
      @include_staged_users = opts[:include_staged_users] || false
      @limit = opts[:limit] || 20
      @groups = opts[:groups]
      @guardian = Guardian.new(@searching_user)
    end
  end

  class ::UserSearch
    prepend UserSearchExt
  end
end
