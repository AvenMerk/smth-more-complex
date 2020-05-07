<template>
  <div>
    <div class="display-panel">
      <div class="display-panel__row display-panel__row_secondary"
           v-if="data && data.rows && data.rows.length">
        <div class="flex-space">
          <input :value="name"
                 @input="report_name = $event.target.value"
                 @blur="editReportName(report_name)"
                 class="input_humble">
        </div>
        <div class="flex-space two-rows-cell">
          <div><b>Юр. лицо:</b> {{entity.name}}</div>
          <div class="sku"><b>Договор:</b> {{entity.contract}}</div>
        </div>
      </div>
    </div>
    <table class="table table-content"
           v-if="data && data.rows && data.rows.length">
      <tr class="table__local">
        <td v-for="col in table_options"
            :style="{width: col.width + 'px', 'min-width': col.width + 'px', 'max-width': col.width + 'px'}">
          <div class="platform"
               @click="lockColumn(col.alias)">
            <div class="button button_icon lock-item"
                 :class="locked[col.alias] ? 'icon_locked' : 'icon_unlocked'"
                 v-if="locked[col.alias] !== undefined"></div>
            <div>{{col.label}}</div>
          </div>
        </td>
      </tr>
      <tr v-for="(row, row_index) in data.rows"
          class="table__local">
        <td v-for="(col, item_index) in table_options"
            :style="{width: col.width + 'px', 'min-width': col.width + 'px', 'max-width': col.width + 'px'}">
          <div class="table-row">
            <div v-if="item_index === 0"
                 style="display: flex"
                 @click="lockRow(row_index)">
              <div class="button button_icon lock-item"
                   :class="locked_rows[row_index] ? 'icon_locked' : 'icon_unlocked'"></div>
              <div>{{row[col.alias]}}</div>
            </div>
            <formatted-input :value="row[col.alias]"
                             @blur="handleBlur($event, row_index, row, col.alias)"
                             v-else></formatted-input>
          </div>
        </td>
      </tr>
      <tr class="table__local">
        <td v-for="(col, item_index) in table_options"
            :style="{width: col.width + 'px', 'min-width': col.width + 'px', 'max-width': col.width + 'px'}"
            >
          <div class="table-row">
            <div v-if="item_index === 0" class="cell-align" v-html="data.total[col.alias]"></div>
            <formatted-input :value="data.total[col.alias]"
                             @blur="handleBlurTotal($event, col.alias)"
                             v-else></formatted-input>
          </div>
        </td>
      </tr>
    </table>
    <div v-else>
      <div class="no-data-message">Нажмите на кнопку "Создать отчет" для создания отчета.</div>
    </div>
  </div>
</template>

<script>
import AF from 'auto/_common/auto-functions';
import FormattedInput from '@/components/formatted-input';
import CF from '@/common/common-functions';
import finance from '@/filters/finance.js';
import CommonGetters from '../../_mixins/common-getters';
import {TABLE_OPTIONS} from './constants';
import {CALC} from './calc';

export default {
  name: 'FormattedInputData',
  components: {FormattedInput},
  mixins: [CommonGetters],
  props: ['data', 'name', 'locked', 'entity', 'locked_rows'],
  data() {
    return {
      edited_table: [],
      table_options: TABLE_OPTIONS,
      editing_items: [],
      checked_columns: [],
      total: {},
      report_name: '',
    };
  },
  mounted() {
    if (this.data && this.data.rows && this.data.rows.length) {
      this.data.rows.map(row => {
        this.edited_table.push({...row, sum: 0});
      });
    }
    if (this.data && this.data.total) {
      this.total = {...this.data.total, period: 'Итого: '}
    }
  },
  methods: {
    editReportName(name) {
      this.$emit('editReportName', name);
    },
    handleBlur(event, row_index, row, col_alias) {
      let value = event.target.value;
      if (+event.target.value !== this.data.rows[row_index][col_alias]) {
        if (typeof value === 'string') {
          value =
            value === ''
              ? 0
              : +event.target.value
              .split(' ')
              .join('')
              .replace(',', '.');
        }
        this.$emit('handleBlur', value, row_index, row, col_alias);
      }
    },
    handleBlurTotal(event, col_alias) {
      let value = event.target.value;
      if (typeof value === 'string') {
        value =
          value === ''
            ? 0
            : +event.target.value
            .split(' ')
            .join('')
            .replace(',', '.');
      }
      this.$emit('handleBlurTotal', value, col_alias);
    },
    lockColumn(alias) {
      this.$emit('lockColumn', alias);
    },
    lockRow(index) {
      this.$emit('lockRow', index);
    }
  },
};
</script>

<style scoped
       lang="scss">
@import '~styles/constants.scss';

.table {
  border: none;
  box-shadow: none;
}

.platform {
  padding: 14px 5px;
  height: 45px;
  display: flex;
  align-items: flex-start;
  border-bottom: 1px solid $border-color;

  &:not(:first-of-type) {
    cursor: pointer;
  }
}

td {
  &:first-of-type {
    padding-left: 30px;
    .cell-align {
      padding-left: 0;
    }
  }
  &:not(:first-of-type) {
    .platform {
      cursor: pointer;
      padding-left: 10px;
    }
  }
}

tr {
  &:last-of-type {
    height: 35px;
    .table-row {
      padding-top: 0;
    }
    td {
      &:not(:first-of-type) {
        border-top: 1px solid $border-color;
      }
      &:first-of-type {
        .table-row {
          padding-right: 0;
        }
      }
    }
  }
}

.lock-item {
  height: 14px;
  width: 14px;
  min-width: 14px;
  background-position: center;
  background-color: transparent;
  background-size: contain;
  padding: 0;
  margin: 0 6px 0 0;
  border: none;
}

.table__local {
  height: 28px;
  margin: 3px 0;
}

.table-row {
  padding: 5px 2px
}

.cell-align {
  height: 45px;
  border-top: 1px solid $border-color;
  display: flex;
  align-items: center;
}

.no-data-message {
  font-size: 20px;
  padding: 40px;
  text-align: center;
}

.two-rows-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 94px;
}
</style>
