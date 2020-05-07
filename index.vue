<template>
  <div class="instrument-container">
    <div class="name-panel">
      <div class="name-panel__edit-part">
        <div class="name-panel__name">
          <slot name="instrument_name">
          </slot>
        </div>
        <multi-thumbler :data="views"
                        @input="selectView"
                        :value="view.data"></multi-thumbler>
      </div>
      <div class="name-panel__filters">
        <div class="icon_download button button_common button_icon"
             v-if="data && data.report && data.report.id && view.data.id === 'report'"
             @click="downloadFile('agentreport/report/download')">
        </div>
        <div>
          <div class="button button_common"
               v-if="data && data.report && data.report.id && view.data.id === 'report'"
               @click="saveReport">
            Сохранить
          </div>
        </div>
        <div>
          <div @click="toggle('filter_panel');toggleHide('side_panel')"
               v-if="view.data.id === 'history'"
               :class="{'active': show.filter_panel}"
               data-test="filter-toggler"
               class="button button_common">
            Фильтр
          </div>
        </div>
        <div>
          <div @click="toggle('side_panel');toggleHide('filter_panel')"
               :class="{'active': show.side_panel}"
               data-test="filter-toggler"
               class="button button_common">
            Создать отчет
          </div>
        </div>
      </div>
    </div>

    <div class="auto-content">
      <div class="auto-work-area auto-work-area_scrollable">
        <item-table :data="item_table_data"
                    @click:tr="getReport"
                    v-if="view.data.id === 'history' && item_table_data.length"
                    :options="table_options">
          <template slot="remove"
                    slot-scope="props">
            <delete-confirm class="hover-tr"
                            :disabled="!permissions.post"
                            @confirm="removeReport(props)"></delete-confirm>
          </template>
        </item-table>
        <div v-else-if="view.data.id === 'history' && !item_table_data.length">
          <div class="no-data-message">Не найдено ни одного отчета</div>
        </div>
        <formatted-input-table v-else
                               @handleBlur="handleBlur"
                               @handleBlurTotal="handleBlurTotal"
                               @lockColumn="lockColumn"
                               @lockRow="lockRow"
                               @editReportName="editReportName"
                               :name="data.report.name"
                               :data="data.report.data"
                               :entity="data.report.entity"
                               :locked="locked"
                               :locked_rows="locked_rows"></formatted-input-table>
      </div>
      <transition name="crawl_right">
        <month-picker
          :data="filter.next.periods"
          :options="{disable_future: true}"
          v-if="show.calendar"
          @accept="changePeriods"
          v-outer-click="{func: toggleHide, param: 'calendar', friend: '.button_date-period'}"
        ></month-picker>
      </transition>
      <transition name="crawl_right">
        <div class="side-menu"
             v-if="show.side_panel"
             data-test="filter-panel">
          <side-filter v-on="filter_listeners"
                       class="side-menu__panel"
                       v-keyup="findData"
                       :status="filter_status"
                       :data="filter_data"
                       :value.sync="filter.next">
            <template slot="top">
              <div class="button button_date-period w140px"
                   style="margin: 0 0 10px"
                   @click="toggle('calendar')"
                   :class="{'active':show.calendar}">
                {{filter.next.periods.month | getMonthName()}} {{filter.next.periods.year}}
              </div>
            </template>
            <template slot="top">
              <input :value="report.name"
                     @input="report.name = $event.target.value"
                     @focus="editReportName(report)">
            </template>
            <template slot="bottom">
              <div class="clients-container">
                <div class="w240px">
                  <drop-list v-if="data.clients_list.length"
                             v-model="filter.next.client"
                             :options="{units: 'Юр. лицо'}"
                             :data="data.clients_list"></drop-list>
                  <div v-else
                       style="cursor: pointer; padding-left: 8px"
                       class="color_blue_bright"
                       @click="show.agent_popup = true">Создайте юр. лицо
                  </div>
                </div>
                <div class="icon_gear"
                     @click="show.agent_popup = true"></div>
              </div>
            </template>
          </side-filter>
        </div>
      </transition>
      <transition name="crawl_right">
        <div class="side-menu"
             v-if="show.filter_panel">
          <side-filter v-on="filter_listeners"
                       class="side-menu__panel"
                       :status="filter_status"
                       :fast_data="filter_fast_data"
                       :fast_value="search">
          </side-filter>
        </div>
      </transition>
    </div>
    <agent-popup v-if="show.agent_popup"
                 :data="data.clients_list"
                 @close="closeAgentPopup"
                 @saveAgent="saveAgent"></agent-popup>
  </div>
</template>
<script>
import DF from '@/common/date-functions';
import AF from 'auto/_common/auto-functions';

import CommonGetters from '../../_mixins/common-getters';
import UrlMixin from '@/mixins/url-mixins';
import ShowMethods from '@/mixins/show-methods';
import CommonMixin from '../_mixins/common';

import DropList from '@/components/drop-list';
import MonthPicker from '../_components/month-picker';
import FormattedInput from '@/components/formatted-input';
import ColumnChooser from 'auto/_components/column-chooser';
import DropDownSlot from '@/components/drop-downs/drop-down-slot';
import MultiThumbler from '@/components/multi-thumbler';
import ItemTable from 'auto/_components/stats-item-table';
import SideFilter from 'auto/_components/side-filter';
import AgentPopup from './agent-popup';
import FormattedInputTable from './formatted-input-table';
import DeleteConfirm from '@/components/delete-confirm';

import OuterClick from '@/directives/outer-click';

import {saveAs} from "file-saver";
import {CALC} from "auto/common/report-agent/calc";

const AVAILABLE_PLATFORMS = ['yad', 'gad'];

export default {
  name: 'ReportAgent',
  mixins: [CommonGetters, CommonMixin, ShowMethods, UrlMixin],
  components: {
    ColumnChooser,
    DropList,
    DropDownSlot,
    FormattedInput,
    MonthPicker,
    MultiThumbler,
    ItemTable,
    SideFilter,
    AgentPopup,
    FormattedInputTable,
    DeleteConfirm
  },
  props: ['urlParams'],
  data() {
    const VIEWS = [
      {
        name: 'История',
        key: 'history',
        id: 'history',
      },
      {
        name: 'Отчет',
        key: 'report',
        id: 'report',
      },
    ];
    return {
      report: {
        name: 'Новый отчет',
        accounts: {
          yad: {},
          gad: {},
        },
        campaigns: {
          yad: [],
          gad: []
        },
        entity: {}
      },
      data: {
        accounts: {
          yad: [],
          gad: []
        },
        clients_list: [],
        colshows: [],
        colstats: [],
        campaigns_yad: [],
        campaigns_gad: [],
        report: {
          data: []
        },
        reports_list: [],
      },
      checked_columns: [],
      locked: {
        shows: false,
        clicks: false,
        ctr: false,
        sum: false,
        cpc: false,
      },
      locked_rows: [],
      filter: {
        current: this.getDefaultFilter(),
        next: this.getDefaultFilter(),
      },
      show: {
        calendar: false,
        side_panel: false,
        agent_popup: false,
        filter_panel: true,
      },
      views: VIEWS,
      view: {
        data: VIEWS[0],
        source: VIEWS,
      },
      should_update: false,
      method_tree: {
        findData: ['processData']
      },
      search: {
        name: '',
        contract: '',
        creator: ''
      }
    };
  },
  filters: {
    getMonthName(month) {
      return DF.getMonthsNames()[month - 1];
    },
  },
  created() {
    this.getClients();
    this.getReportsList();
    this.getCampaigns().then(() => this.fillFilterCampaigns());
    AVAILABLE_PLATFORMS.forEach(platform => {
      this.getAccounts({platform_alias: platform}).then(accs => {
        accs.unshift({id: -10, name: 'Не выбрано'});
        this.data.accounts[platform] = accs
      }).then(() => this.fillFilterAccounts(platform));
    });
  },
  computed: {
    item_table_data() {
      let ret = this.data.reports_list;
      ret = ret.filter(report => report.name.toLowerCase().includes(this.search.name.toLowerCase())
        && report.contract.toLowerCase().includes(this.search.contract.toLowerCase())
        && report.creator.toLowerCase().includes(this.search.creator.toLowerCase()));
      return ret;
    },
    filtered_camps_yad() {
      let ret = [];
      if (this.data && this.data.campaigns_yad && this.data.campaigns_yad.length) {
        if (this.filter.next.yad) {
          ret = this.data.campaigns_yad.filter(campaign => campaign.account === this.filter.next.yad.id)
        }
      }
      return ret;
    },
    filtered_camps_gad() {
      let ret = [];
      if (this.data && this.data.campaigns_gad && this.data.campaigns_gad.length) {
        if (this.filter.next.gad) {
          ret = this.data.campaigns_gad.filter(campaign => campaign.account === this.filter.next.gad.id)
        }
      }
      return ret;
    },
    filter_status() {
      return {
        calendar: this.show && this.show.calendar,
        changed: this.filter_changed,
        default_next: true,
        errors: this.back_filter_errors,
      };
    },
    table_options() {
      let colstats = [
        {
          label: 'Дата',
          alias: 'created_at',
          width: 270,
          $$custom: {
            class_names: {
              td: 'clickable',
            },
          }
        },
        {
          label: 'Имя/название',
          alias: 'name',
          width: 270,
          $$custom: {
            class_names: {
              td: 'clickable',
            },
          }
        },
        {
          label: 'Юр.лицо',
          alias: 'contract',
          width: 270,
          $$custom: {
            class_names: {
              td: 'clickable',
            },
          }
        },
        {
          label: 'Имя пользователя',
          alias: 'creator',
          width: 270,
          $$custom: {
            class_names: {
              td: 'clickable',
            },
          }
        },
        {
          label: '',
          alias: 'remove',
          width: 65,
          $$custom: {
            type: 'slot',
          },
        },
      ];

      return {
        colstats,
      };
    },
    filter_data() {
      let filters = [];
      if (this.data && this.data.accounts && this.data.accounts.yad && this.data.accounts.yad.length) {
        filters.push(
          {
            alias: 'yad',
            data: this.data.accounts.yad,
            options: {units: 'Аккаунты ДИРЕКТ'},
            type: 'single-select'
          });
        if (this.filter && this.filter.next && this.filter.next.yad && this.filter.next.yad.id !== -10) {
          filters.push({
            alias: 'campaigns_yad',
            data: this.filtered_camps_yad,
            options: {units: 'Кампании ДИРЕКТ', base: 'mimic'},
            type: 'multi-select'
          });
        }
      }
      if (this.data && this.data.accounts && this.data.accounts.gad && this.data.accounts.gad.length) {
        filters.push(
          {
            alias: 'gad',
            data: this.data.accounts.gad,
            options: {units: 'Аккаунты ADS'},
            type: 'single-select'
          });
        if (this.filter && this.filter.next && this.filter.next.gad && this.filter.next.gad.id !== -10) {
          filters.push({
            alias: 'campaigns_gad',
            data: this.filtered_camps_gad,
            options: {units: 'Кампании ADS', base: 'mimic'},
            type: 'multi-select'
          });
        }
      }
      return filters;
    },
    filter_fast_data() {
      return [
        {
          alias: 'name',
          fast: true,
          placeholder: 'Имя/название',
          type: 'text',
        },
        {
          alias: 'contract',
          fast: true,
          placeholder: 'Юр. лицо',
          type: 'text',
        },
        {
          alias: 'creator',
          fast: true,
          placeholder: 'Имя пользователя',
          type: 'text',
        },
      ];
    },
    filter_listeners() {
      return {
        findData: this.findData,
        toggleCalendar: this.toggle.bind(this, 'filter_calendar'),
        refreshFilter: this.refreshFilter,
        onFilterChange: this.updateFilterValue,
      };
    },
  },
  methods: {
    closeAgentPopup() {
      this.show.agent_popup = false;
    },
    changePeriods(month, year) {
      if (typeof month === 'undefined' || typeof year === 'undefined') {
        return;
      }
      this.filter.next.periods = {month, year};
    },

    fillFilterClients() {
      this.filter.next.client = this.getCurrentClient();
    },
    fillFilterCampaigns() {
      this.filter.next.campaigns_yad = this.filterCampaigns('yad');
      this.filter.next.campaigns_gad = this.filterCampaigns('gad');
    },
    fillFilterAccounts(source) {
      this.filter.next[source] = this.getCurrentAccount(source);
    },
    getCurrentClient() {
      let clients_list = this.data && this.data.clients_list;
      return clients_list ? clients_list[0] : null;
    },
    getCurrentCampaigns(source) {
      let camps_list = ((this.data && this.data[`campaigns_${source}`]) || [])
        .map(camp => camp.id);
      const filter_camps =
        (this.filter &&
          (this.filter.current.campaigns || (this.filter.current[`campaigns_${source}`]
            && this.filter.current[`campaigns_${source}`].id))) || [];
      return filter_camps && filter_camps.length ? filter_camps : camps_list;
    },
    filterCampaigns(source) {
      let ret = [];
      if (this.data && this.data[`campaigns_${source}`] && this.data[`campaigns_${source}`].length) {
        if (this.filter.next[source]) {
          ret = this.data[`campaigns_${source}`].filter(campaign => (campaign.account === this.filter.next[source].id));
        }
      }
      return ret;
    },
    getCurrentAccount(source) {
      let accs_list = ((this.data && this.data.accounts && this.data.accounts[source]) || []);
      return accs_list ? accs_list[0] : null;
    },
    getDefaultFilter(force_default) {
      return Object.assign({
        periods: {
          month: (!force_default && this.getUrlItem('month')) || new Date().getMonth() + 1,
          year: (!force_default && this.getUrlItem('year')) || new Date().getFullYear(),
        },
        client: this.getCurrentClient() || {},
        yad: (!force_default && this.getCurrentAccount('yad')) || {},
        gad: (!force_default && this.getCurrentAccount('gad')) || {},
        campaigns_yad: (!force_default && this.filterCampaigns('yad')) || [],
        campaigns_gad: (!force_default && this.filterCampaigns('gad')) || [],
      });
    },
    getFilterToUrl(filter) {
      let f = filter || this.filter.next;

      return {
        month: f.periods.month,
        year: f.periods.year,
        client: f.client,
        yad: f.yad,
        gad: f.gad,
        campaigns_yad: f.campaigns_yad,
        campaigns_gad: f.campaigns_gad,
      };
    },
    getFormQuery() {
      let f = this.filter.next;

      return {
        year: f.periods.year,
        month: f.periods.month,
        client: f.client,
        yad: f.yad,
        gad: f.gad,
        campaigns_yad: f.campaigns_yad,
        campaigns_gad: f.campaigns_gad,
      };
    },
    getReportsList() {
      return this.service.get('agentreport/report/list').then(response => {
        if (!response) {
          throw response;
        } else {
          this.data.reports_list = [];
          response.forEach(report => {
            this.data.reports_list.push({
              ...report,
              contract: report.entity.name
            });
          });
        }
      }).catch(AF.catchNotify);
    },
    getClients() {
      this.service.get('agentreport/entity')
        .then(response => {
          if (!response) {
            throw response;
          } else {
            this.data.clients_list = response.res || [];
          }
        }).then(() => this.fillFilterClients()).catch(AF.catchNotify);
    },
    getCampaigns() {
      return this.service.get('agentreport/campaigns').then(response => {
        if (!response) {
          throw response;
        } else {
          this.data.campaigns_yad = (response.yad || []);
          this.data.campaigns_gad = (response.gad || []);
        }
      }).catch(AF.catchNotify);
    },
    findData() {
      const places_acc = {};
      if (this.filter.next.yad && this.filter.next.yad.id !== -10) {
        places_acc['yad'] = [{
          account: this.filter.next.yad.id,
          camps: this.filter.next.campaigns_yad || [],
        }]
      }
      if (this.filter.next.gad && this.filter.next.gad.id !== -10) {
        places_acc['gad'] = [{
          account: this.filter.next.gad.id.toString(),
          camps: this.filter.next.campaigns_gad || [],
        }]
      }
      if (!places_acc.yad && !places_acc.gad) {
        AF.notify({type: 'error', text: 'Выберите аккаунт'});
        return
      }
      const report_to_send = {
        name: this.report.name,
        client: this.urlParams.query.clientId,
        places_acc: places_acc,
        month: this.filter.next.periods.month,
        year: this.filter.next.periods.year,
        entity_id: this.filter.next.client.id
      };
      if (!this.permissions.post) {
        AF.notify({text: 'Действие недоступно', type: 'warning'});

        return null;
      } else {
        this.service
          .post('agentreport/report', report_to_send)
          .then(response => {
            if (!response) {
              return;
            } else {
              this.data.report = {
                ...response,
                entity: {
                  ...this.filter.next.client,
                  id: response.entity,
                }
              };

              this.data.report.data.total = {
                ...this.data.report.data.total,
                period: 'Итого: '
              };
              this.locked_rows = [];
              for (let i = 0; i < this.data.report.data.rows.length; i++) {
                this.locked_rows.push(false);
              }
              this.selectView(this.views[1]);
              this.should_update = true;
            }
            // this.applyFilter();
          });
      }
    },
    saveAgent(agent, creation_mode, index) {
      if (!this.permissions.post) {
        AF.notify({text: 'Действие недоступно', type: 'warning'});

        return null;
      } else if (creation_mode) {
        this.service.post('agentreport/entity', {
            name: agent.name,
            contract: agent.contract
          })
          .then(response => {
            if (response && response.errors) {
              AF.notify({type: 'error', text: 'Произошла ошибка сохранения.'});
            } else {
              this.data.clients_list.push(response);
              if (this.filter.current.client && this.filter.current.client === {}) {
                this.filter.current.client = this.data.clients_list[0];
              }
            }
          }).catch(AF.catchNotify);
      } else {
        this.service.put('agentreport/entity', {
            entity_id: agent.entity_id,
            name: agent.name,
            contract: agent.contract
          })
          .then(response => {
            if (response && response.errors) {
              AF.notify({type: 'error', text: 'Произошла ошибка сохранения.'});
            } else {
              this.data.clients_list[index].name = response.name;
              this.data.clients_list[index].contract = response.contract;
            }
          }).catch(AF.catchNotify);
      }
    },
    downloadFile() {
      const config = {
        method: 'post',
        responseType: 'arraybuffer',
        url: 'agentreport/report/download',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        name: this.data.report.name + '.docx',
        data: {
          report_id: this.data.report.id,
          report_type: 'docx',
        },
        headers: {
          ['X-Full-Data']: false,
        },
      };
      this.service
        .request(config).then(response => {
        const response_blob = new Blob([response], {type: (config && config.type) || 'octet/stream'});
        let header_name = decodeURIComponent(response['content-disposition']);
        let name = header_name.match(/[^']+$/);
        saveAs(response_blob, config.name || (name && name[0]));
      });
    },
    saveReport() {
      const to_send = {
        report_id: this.data.report.id,
        user: this.$store.getters.user.id,
        entity_id: this.data.report.entity.id,
        name: this.data.report.name,
        data: {
          rows: this.data.report.data.rows,
          total: this.data.report.data.total,
        },
      };
      if (!this.permissions.post) {
        AF.notify({text: 'Действие недоступно', type: 'warning'});

        return null;
      } else {
        this.service.put('agentreport/report', to_send).then(response => {
          if (response && response.res) {
            AF.notify({type: 'success', text: 'Сохранение прошло успешно'});
          } else {
            throw response;
          }
        }).catch(() => AF.notify({type: 'error', text: 'Произошла ошибка сохранения.'}));
        this.should_update = true;
      }
    },
    getReport(element) {
      if (!element.event.target.className.includes('button')) {
        this.service.get('agentreport/report', {params: {report_id: element.entry.report_id}})
          .then(response => {
            if (!response) {
              return null;
            } else {
              this.data.report = {
                ...response,
                entity: {
                  ...element.entry.entity,
                  id: response.entity,
                }
              };
              this.data.report.data.total = {
                ...this.data.report.data.total,
                period: 'Итого: '
              };
              this.locked_rows = [];
              for (let i = 0; i < this.data.report.data.rows.length; i++) {
                this.locked_rows.push(false);
              }
              this.selectView(this.views[1]);
              // this.data.reports_list = response;
            }
            // this.applyFilter();
          });
      }
    },
    removeReport(element) {
      if (!this.permissions.post) {
        AF.notify({text: 'Действие недоступно', type: 'warning'});

        return null;
      } else {
        this.service.delete('agentreport/report', {data: {report_id: element.entry.report_id}})
          .then(response => {
            if (response && response.res === 1) {
              this.data.reports_list = this.data.reports_list.filter(report => report.report_id !== element.entry.report_id)
            } else {
              return null;
            }
          }).catch(AF.catchNotify);
      }
    },
    selectView(view) {
      if (view.key === 'history' && this.should_update) {
        this.getReportsList();
        this.should_update = false;
      } else if (view.key !== 'history') {
        this.show.filter_panel = false;
        this.show.side_panel = false;
      }
      this.view.data = view;
    },
    editReportName(name) {
      this.data.report.name = name
    },
    lockColumn(alias) {
      this.locked[alias] = this.$set(this.locked, alias, !this.locked[alias])
    },
    lockRow(index) {
      this.$set(this.locked_rows, index, !this.locked_rows[index])
    },
    updateFilterValue(payload) {
      const target = payload.fast ? this.search : this.filter.next;
      target[payload.alias] = payload.value;
      if (AVAILABLE_PLATFORMS.includes(payload.alias)) {
        target[`campaigns_${payload.alias}`] = [];
      }
    },
    // calculations for formatted-input-table
    handleBlur(value, row_index, row, col_alias) {
      this.editTableData(row_index, value, col_alias);
      this.calcDependencies(col_alias, row_index);
      this.calcTotal(col_alias);
    },
    handleBlurTotal(value, col_alias) {
      this.editTotal(value, col_alias);
    },
    editTableData(row_index, value, col_alias) {
      this.data.report.data.rows[row_index][col_alias] = value;
      this.calcDependencies(col_alias, row_index);
    },
    editTotal(value, col_alias) {
      const delta = value - this.data.report.data.total[col_alias];
      this.data.report.data.total[col_alias] = value;
      this.recalcTotal(col_alias, delta);
    },
    // рассчитывает значения в строке "итого" при изменениях в этой строке
    recalcTotal(col_alias, delta) {
      this.checkDependencies(col_alias);
      this.checked_columns.forEach(column => {
        CALC[column].forEach(element => {
          this.data.report.data.total[column] = element.calc(this.data.report.data.total);
        });
        // this.calcTotal(column);
      });
      // пересчет колонки с col_alias (измененной) по всем строкам
      const rows_to_change = [];
      this.locked_rows.forEach((row, idx) => {
        if (!row) {
          rows_to_change.push({key: idx})
        }
      });
      rows_to_change.map(row => {
        this.data.report.data.rows[row.key][col_alias] = +this.data.report.data.rows[row.key][col_alias] + +(delta / rows_to_change.length).toFixed(2);
        this.checked_columns.forEach(column => {
          CALC[column].forEach(element => {
            this.data.report.data.rows[row.key][column] = element.calc(this.data.report.data.rows[row.key]);
          });
          this.calcTotal(column);
        });
      });
      this.checked_columns = [];
    },
    // рассчитывает "итого" при изменении строк
    calcTotal(col_alias) {
      this.data.report.data.total[col_alias] = 0;
      this.data.report.data.rows.forEach(row => {
        this.data.report.data.total[col_alias] += row[col_alias];
      });
    },
    calcDependencies(col_alias, row_index) {
      this.checkDependencies(col_alias);
      // calculate changable items
      this.checked_columns.forEach(column => {
        CALC[column].forEach(element => {
          this.data.report.data.rows[row_index][column] = element.calc(this.data.report.data.rows[row_index]);
        });
        this.calcTotal(column);
      });
      this.checked_columns = [];
    },
    checkDependencies(col_alias) {
      if (CALC[col_alias]) {
        // check for all items, that may change
        CALC[col_alias].forEach(element => {
          element.calc_dependence.forEach(dependency => {
            if (!this.locked[dependency]) {
              this.checked_columns.push(dependency);
            }
            CALC[dependency].forEach(child => {
              child.calc_dependence.forEach(child_dependence => {
                if (!this.checked_columns.includes(child_dependence)
                  && child_dependence !== col_alias
                  && !this.locked[child_dependence]
                  && CALC[child_dependence]) {
                  this.checked_columns.push(child_dependence);
                }
              })
            })
          })
        })
      }
    }
  },
};
</script>

<style scoped
       lang="scss">
@import '~styles/constants.scss';

.auto-content__instrument {
  /*flex-grow: unset;*/
}

.name-panel__edit-part {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.button_display-primary {
  font-size: 11px;
  text-transform: none;
}

.icon_edit {
  margin-right: 35px;
}

.icon_refresh {
  background-position: center;
  background-size: 12px 12px;
}

.name-panel__name {
  margin-right: 30px;
}

.icon_download {
  margin-left: 35px;
}

.icon_ {
  &eye_blue,
  &eye_grey {
    cursor: pointer;
  }
}

.side-menu__panel {
  z-index: 2;
}

.auto-work-area {
  z-index: 1;
}

.name-panel__superclient {
  text-align: right;
  font-size: 13px;
  font-weight: bold;
}

.pressed {
  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);
}

table {
  position: relative;
  border: solid $border-color;
  border-width: 1px 0;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 100, 0.05);

  & tr > td:not(:nth-child(1)) {
    border-left: 1px solid $border-color;
  }

  & tr > td.borderless,
  & tr > td.borderless + td {
    border-left: 1px solid transparent;
  }
}

.table-content {
  /*table-layout: fixed;*/

  td {
    height: 25px;
    vertical-align: center;
  }

  tr:last-child {
    td {
      border-top: 1px solid #444;
      border-bottom: 1px solid #444;

      &:nth-child(2) {
        input {
          font-size: 12px;
          text-align: center;
          text-transform: uppercase;
        }
      }
    }
  }
}

td {
  input {
    font-size: 11px;
    text-overflow: ellipsis;
  }

  text-align: center;
  font-size: 11px;
}

.table-container {
  background: #fff;
  z-index: 1;
}

.table__local-total-line {
  td {
    border-top: 2px solid $border-color;
  }
}

.table__total-line {
  td {
    border-top: 2px solid $border-color;
  }
}

tr:not(.table__local-total-line) + tr:not(.table__local-total-line) {
  td {
    border-top: 1px solid $border-color;
  }
}

.table-header {
  td:last-child {
    height: 50px;
  }
}

textarea {
  resize: none;
  outline: 0;
  font-size: 11px;
  width: 100%;
  overflow: hidden;
  border: 0;
  padding: 8px 2px 0;
  height: 55px;
  text-align: center;
  overflow-wrap: normal;
  font-family: Roboto;
}

.side-menu__panel {
  .modal-popup {
    top: 50px;
    right: 309px;
  }
}

table.table-content tr > td, table.table-header tr > td {
  padding-left: 0;
}

.auto-content::v-deep input[readonly] {
  color: #000;
}

.clients-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.icon_gear, .pointer {
  cursor: pointer;
}

.no-data-message {
  font-size: 20px;
  padding: 40px;
  text-align: center;
}

</style>

<style scoped>
/deep/
.row-header .clickable {
  cursor: default !important;
}
</style>
