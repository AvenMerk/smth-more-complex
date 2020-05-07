<template>
  <div class="modal-window"
       v-outer-click="{func: hideSelf}"
       style="width: 800px">
    <div class="modal-window-header">
      Редактирование и создание юр.лиц
      <div class="detalization-close"
           @click="hideSelf"></div>
    </div>
    <div class="flex-fill"
         style="max-height: 500px">
      <div class="modal-window-block modal-window-block_leftmost list-block border-right"
           style="flex: 1 0 0%; overflow: auto">
        <div class="search-create-container">
          <div class="input-container_search">
            <input placeholder="поиск юр. лица">
          </div>
          <div class="button button_icon icon_plus"
               @click="createAgent()"></div>
        </div>

        <div v-for="(agent, index) in data"
             class="item-border">
          <div class="agent-item"
               :class="{'chosen-item': chosen_item.index === index}"
               @click="chooseItem(agent, index)">{{agent.name}}</div>
        </div>
      </div>
      <div class="modal-window-block modal-window-block_rightmost"
           style="flex: 2 0 0%">
        <div class="modal-window-block__header"
             v-if="!creation_mode">Редактирование юр.лица</div>
        <div class="modal-window-block__header"
             v-else>Создание юр.лица</div>

        <div class="vertical-indent">
          <div class="input-item">
            <div class="input-header">Имя</div>
            <input :value="editing.name"
                   @input="editing.name = $event.target.value"
                   @focus="editAgentName(editing.name)"
                   class="w300px">
          </div>
          <div class="input-item">
            <div class="input-header">Контракт</div>
            <input :value="editing.contract"
                   @input="editing.contract = $event.target.value"
                   @focus="editAgentContract(editing.contract)"
                   class="w300px">
          </div>
        </div>
        <div class="button button_common"
             style="margin-left: 0"
             :class="{'disabled': !is_input_edited}"
             @click="saveAgent()">Сохранить</div>
      </div>
    </div>
<!--    <div class="content-container">-->
<!--      <div v-for="agent in data">-->
<!--        <div>{{agent.name}}</div>-->
<!--      </div>-->
<!--    </div>-->
  </div>
</template>

<script>
  import AF from 'auto/_common/auto-functions';
  import FormatInput from '@/components/formatted-input';
  import CF from '@/common/common-functions';
  import CommonGetters from '../../_mixins/common-getters';

  export default {
    name: 'AgentPopup',
    components: {FormatInput},
    mixins: [CommonGetters],
    props: ['data'],
    data() {
      return {
        creation_mode: true,
        chosen_item: {
          index: '',
          name: '',
          contract: '',
        },
        editing: {
          name: '',
          contract: '',
        },
      };
    },
    created() {},
    computed: {
      is_input_edited() {
        return this.editing.name.trim() !== '' && this.editing.contract.trim() !== ''
          && (this.chosen_item.name.trim() !== this.editing.name.trim() ||
          this.chosen_item.contract.trim() !== this.editing.contract.trim());
      }
    },
    methods: {
      createAgent() {
        this.creation_mode = true;
        this.chosen_item = {index: '', name: '', contract: ''};
        this.editing.name = '';
        this.editing.contract = '';
      },
      chooseItem(item, index) {
        this.creation_mode = false;
        this.editing.name = item.name;
        this.editing.contract = item.contract;
        this.chosen_item = { index, ...this.editing};
      },
      hideSelf() {
        this.$emit('close');
      },
      editAgentName(name) {
        this.editing.name = name;
      },
      editAgentContract(contract) {
        this.editing.contract = contract;
      },
      saveAgent() {
        if (this.is_input_edited) {
          let agent;
          if (this.creation_mode) {
            agent = {
              name: this.editing.name,
              contract: this.editing.contract
            }
          } else {
            agent = {
              entity_id: this.data[this.chosen_item.index].id,
              name: this.editing.name,
              contract: this.editing.contract
            }
          }
          this.$emit('saveAgent', agent, this.creation_mode, this.chosen_item.index);
        } else {
          // Just in case someone'll click disabled btn
          this.creation_mode ? AF.notify({type: 'warning', text: 'Заполните поля перед отправкой запроса.'})
            : AF.notify({type: 'warning', text: 'Внесите изменения перед сохранением.'})
        }
      },
    },
  };
</script>

<style scoped
       lang="scss">
  @import '~styles/constants.scss';

  .modal-window-block {
    min-height: 250px;
    padding: 16px 8px 8px 16px;
  }

  .modal-window-block__header {
    padding-left: 0;
    padding-bottom: 10px;
  }

  .search-create-container {
    display: flex;
  }
  .item-border {
    border-bottom: 1px solid $border-color;
    /*border-left: 1px solid transparent;*/
    &:last-of-type {
      border-bottom: none;
    }
  }
  .agent-item {
    display: flex;
    align-items: center;
    padding: 0 5px;
    height: 45px;
    cursor: pointer;
    &:hover {
      background-color: $grey_pale;
    }
  }
  .chosen-item {
    background-color: $grey_pale;
  }
  .input-item {
    width: 70px;
    margin-bottom: 10px;
  }

  .input-header {
    padding: 0 0 8px 0;
  }

  .detalization-campaign__archive {
    color: $grey_text;
    padding: 8px 0;
  }
</style>
