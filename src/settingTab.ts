import WereadPlugin from 'main';
import { PluginSettingTab, Setting, App, Platform } from 'obsidian';
import { settingsStore } from './settings';
import { get } from 'svelte/store';
import WereadLoginModel from './components/wereadLoginModel';
import WereadLogoutModel from './components/wereadLogoutModel';
import CookieCloudConfigModal from './components/cookieCloudConfigModel';
import { TemplateEditorWindow } from './components/templateEditorWindow';

const pickBy = require('lodash.pickby');
const pickBy = require('lodash.pickby');
import { Renderer } from './renderer';
import { getEncodeCookieString } from './utils/cookiesUtil';
import { Notice } from 'obsidian';

export class WereadSettingsTab extends PluginSettingTab {
	private plugin: WereadPlugin;
	private renderer: Renderer;

	constructor(app: App, plugin: WereadPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.renderer = new Renderer();
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: '设置微信读书插件' });

		this.showLoginMethod();

		const isCookieValid = get(settingsStore).isCookieValid;
		const loginMethod = get(settingsStore).loginMethod;

		if (loginMethod === 'scan') {
			if (Platform.isDesktopApp) {
				if (isCookieValid) {
					this.showLogout();
				} else {
					this.showLogin();
				}
			} else {
				if (isCookieValid) {
					this.showMobileLogout();
				} else {
					this.showMobileLogin();
				}
			}
		} else {
			this.showCookieCloudInfo();
		}

		this.notebookFolder();
		this.notebookBlacklist();
		this.noteCountLimit();
		this.fileNameType();
		this.removeParens();
		this.subFolderType();
		this.convertTagToggle();
		this.saveArticleToggle();
		this.saveReadingInfoToggle();
		this.showEmptyChapterTitleToggle();
		this.dailyNotes();
		const dailyNotesToggle = get(settingsStore).dailyNotesToggle;
		if (dailyNotesToggle) {
			this.dailyNotesFolder();
			this.dailyNoteFormat();
			this.insertAfter();
			this.autoCreateDailyNote();
			if (get(settingsStore).autoCreateDailyNote) {
				this.dailyNoteTemplate();
			}
		}
		this.customTagSetting();
		this.template();
		if (Platform.isDesktopApp) {
			this.showDebugHelp();
		}
	}

	private showMobileLogin() {
		const info = this.containerEl.createDiv();
		info.setText('微信读书未登录，请先在电脑端登录！');
	}

	private showMobileLogout() {
		const info = this.containerEl.createDiv();
		info.setText(`微信读书已登录，用户名：${get(settingsStore).user}`);
	}

	private notebookFolder(): void {
		new Setting(this.containerEl)
			.setName('笔记保存位置')
			.setDesc('请选择Obsidian Vault中微信读书笔记存放的位置')
			.addDropdown((dropdown) => {
				const files = (this.app.vault.adapter as any).files;
				const folders = pickBy(files, (val: any) => {
					return val.type === 'folder';
				});

				Object.keys(folders).forEach((val) => {
					dropdown.addOption(val, val);
				});
				return dropdown
					.setValue(get(settingsStore).noteLocation)
					.onChange(async (value) => {
						settingsStore.actions.setNoteLocationFolder(value);
					});
			});
	}

	private notebookBlacklist(): void {
		new Setting(this.containerEl)
			.setName('书籍黑名单')
			.setDesc('请填写不同步的bookId，bookId可在meta信息中找到，多本书使用逗号「，」隔开')
			.addTextArea((input) => {
				input.setValue(get(settingsStore).notesBlacklist).onChange((value: string) => {
					settingsStore.actions.setNoteBlacklist(value);
				});
			});
	}

	private showLogin(): void {
		new Setting(this.containerEl).setName('登录微信读书').addButton((button) => {
			return button
				.setButtonText('登录')
				.setCta()
				.onClick(async () => {
					button.setDisabled(true);
					const logoutModel = new WereadLoginModel(this);
					await logoutModel.doLogin();
					this.display();
				});
		});
	}

	private saveArticleToggle(): void {
		new Setting(this.containerEl)
			.setName('同步公众号文章?')
			.setDesc('开启此选项会将同步公众号文章到单独的笔记中')
			.addToggle((toggle) => {
				return toggle.setValue(get(settingsStore).saveArticleToggle).onChange((value) => {
					settingsStore.actions.setSaveArticleToggle(value);
					this.display();
				});
			});
	}
	private saveReadingInfoToggle(): void {
		new Setting(this.containerEl)
			.setName('保存阅读元数据?')
			.setDesc('开启此选项会阅读数据写入frontmatter')
			.addToggle((toggle) => {
				return toggle
					.setValue(get(settingsStore).saveReadingInfoToggle)
					.onChange((value) => {
						settingsStore.actions.setSaveReadingInfoToggle(value);
						this.display();
					});
			});
	}
	private convertTagToggle(): void {
		new Setting(this.containerEl)
			.setName('将标签转换为双链？')
			.setDesc('开启此选项会笔记中的 #标签 转换为：[[标签]]')
			.addToggle((toggle) => {
				return toggle.setValue(get(settingsStore).convertTags).onChange((value) => {
					settingsStore.actions.setConvertTags(value);
					this.display();
				});
			});
	}

	private dailyNotes(): void {
		new Setting(this.containerEl)
			.setName('是否保存笔记到 DailyNotes？')
			.setHeading()
			.addToggle((toggle) => {
				return toggle.setValue(get(settingsStore).dailyNotesToggle).onChange((value) => {
					console.debug('set daily notes toggle to', value);
					settingsStore.actions.setDailyNotesToggle(value);
					this.display();
				});
			});
	}

	private autoCreateDailyNote(): void {
		new Setting(this.containerEl)
			.setName('自动创建Daily Note')
			.setDesc('当Daily Note不存在时自动创建')
			.addToggle((toggle) => {
				return toggle.setValue(get(settingsStore).autoCreateDailyNote).onChange((value) => {
					settingsStore.actions.setAutoCreateDailyNote(value);
				});
			});
	}

	private dailyNoteTemplate(): void {
		new Setting(this.containerEl)
			.setName('日记模板')
			.setDesc('为自动创建的Daily Note选择模板文件(输入路径或文件名)')
			.addText((text) => {
				const allFiles = this.app.vault.getMarkdownFiles().map((f) => f.path);
				let currentValue = get(settingsStore).dailyNoteTemplatePath || '';

				text.inputEl.style.width = '60%';
				text.inputEl.style.height = '30px';
				text.setValue(currentValue).onChange(async (value) => {
					currentValue = value;
					settingsStore.actions.setDailyNoteTemplatePath(value);
				});

				// 创建联想下拉框
				const datalist = document.createElement('datalist');
				datalist.id = 'template-suggestions';
				text.inputEl.setAttribute('list', 'template-suggestions');
				text.inputEl.after(datalist);

				// 动态更新联想列表
				text.inputEl.addEventListener('input', () => {
					const input = text.inputEl.value.toLowerCase();
					const filtered = allFiles
						.filter((f) => f.toLowerCase().includes(input))
						.slice(0, 10); // 限制显示数量

					datalist.innerHTML = '';
					filtered.forEach((file) => {
						const option = document.createElement('option');
						option.value = file;
						datalist.appendChild(option);
					});
				});
			});
	}

	private dailyNotesFolder() {
		new Setting(this.containerEl)
			.setName('Daily Notes文件夹')
			.setDesc('请选择Daily Notes文件夹')
			.addDropdown((dropdown) => {
				const files = (this.app.vault.adapter as any).files;
				const folders = pickBy(files, (val: any) => {
					return val.type === 'folder';
				});

				Object.keys(folders).forEach((val) => {
					dropdown.addOption(val, val);
				});
				return dropdown
					.setValue(get(settingsStore).dailyNotesLocation)
					.onChange(async (value) => {
						settingsStore.actions.setDailyNotesFolder(value);
					});
			});
	}

	private dailyNoteFormat() {
		new Setting(this.containerEl)
			.setName('Daily Notes Format')
			.setDesc(
				'请填写Daily Notes文件名格式，支持官方Daily Notes插件的格式，比如：YYYY-MM-DD \
				 和 Periodic Notes的嵌套格式，比如 YYYY/[W]ww/YYYY-MM-DD'
			)
			.addText((input) => {
				input.setValue(get(settingsStore).dailyNotesFormat).onChange((value: string) => {
					settingsStore.actions.setDailyNotesFormat(value);
				});
			});
	}

	private insertAfter() {
		new Setting(this.containerEl)
			.setName('在特定区间之内插入')
			.setDesc(
				'请填写Daily Notes中希望读书笔记插入的区间，使用前记得修改Daily Notes模板🫡, 💥注意: 区间之内的内容会被覆盖，请不要在区间内修改内容，'
			)
			.addText((input) => {
				input.setValue(get(settingsStore).insertAfter).onChange((value: string) => {
					settingsStore.actions.setInsertAfter(value);
				});
			})
			.addButton((btn) => {
				return (btn.setButtonText('至').buttonEl.style.borderStyle = 'none');
			})
			.addText((input) => {
				input.setValue(get(settingsStore).insertBefore).onChange((value: string) => {
					settingsStore.actions.setInsertBefore(value);
				});
			});
	}

	private subFolderType(): void {
		new Setting(this.containerEl)
			.setName('文件夹分类')
			.setDesc('请选择按照哪个维度对笔记文件进行分类')
			.addDropdown((dropdown) => {
				dropdown.addOptions({
					'-1': '无分类',
					title: '书名',
					category: '图书分类'
				});
				return dropdown
					.setValue(get(settingsStore).subFolderType)
					.onChange(async (value) => {
						settingsStore.actions.setSubFolderType(value);
					});
			});
	}

	private fileNameType(): void {
		new Setting(this.containerEl)
			.setName('文件名模板')
			.setDesc('你选择你喜欢的文件名模板，重复的书会在文件名后加上ID')
			.addDropdown((dropdown) => {
				dropdown.addOptions({
					BOOK_ID: 'bookId',
					BOOK_NAME: '书名',
					BOOK_NAME_AUTHOR: '书名-作者名',
					BOOK_NAME_BOOKID: '书名-bookId'
				});
				return dropdown
					.setValue(get(settingsStore).fileNameType)
					.onChange(async (value) => {
						settingsStore.actions.setFileNameType(value);
					});
			});
	}

	private removeParens(): void {
		new Setting(this.containerEl)
			.setName('移除书名中的括号内容')
			.setDesc('是否移除书名中的括号及其内部文字（注：谨慎启用，可能导致重名）')
			.addToggle((toggle) => {
				return toggle.setValue(get(settingsStore).removeParens).onChange((value) => {
					settingsStore.actions.setRemoveParens(value);
					this.display();
				});
			});
		// 白名单 textarea，仅在启用移除括号时显示
		if (get(settingsStore).removeParens) {
			new Setting(this.containerEl)
				.setName('括号移除白名单')
				.setDesc('如文件名包含下列任意文本，则不移除括号。每行一个关键词。')
				.addTextArea((text) => {
					text.setValue(get(settingsStore).removeParensWhitelist || '').onChange(
						(value: string) => {
							settingsStore.actions.setRemoveParensWhitelist(value);
						}
					);
				});
		}
	}

	private showLogout(): void {
		document.createRange().createContextualFragment;
		const desc = document.createRange().createContextualFragment(
			`1. 登录：点击登录按钮，在弹出页面【扫码登录】。
             2. 注销：点击注销，在弹出书架页面右上角点击头像，下拉菜单选择【退出登录】`
		);

		new Setting(this.containerEl)
			.setName(`微信读书已登录，用户名：  ${get(settingsStore).user}`)
			.setDesc(desc)
			.addButton((button) => {
				return button
					.setButtonText('注销')
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						const logoutModel = new WereadLogoutModel(this);
						await logoutModel.doLogout();
						this.display();
					});
			})
			.addButton((button) => {
				return button
					.setButtonText('拷贝Cookie')
					.setCta()
					.onClick(async () => {
						const cookieStr = getEncodeCookieString();
						navigator.clipboard.writeText(cookieStr).then(
							function () {
								new Notice('拷贝Cookie到剪切板成功！');
							},
							function (error) {
								new Notice('拷贝Cookie到剪切板失败！');
								console.error('拷贝微信读书Cookie失败', error);
							}
						);
					});
			});
	}

	private template(): void {
		new Setting(this.containerEl)
			.setName('笔记模板设置')
			.setHeading()
			.addButton((button) => {
				return button
					.setButtonText('编辑模板')
					.setCta()
					.onClick(() => {
						const editorWindow = new TemplateEditorWindow(
							this.app,
							get(settingsStore).template,
							(newTemplate: string) => {
								settingsStore.actions.setTemplate(newTemplate);
							}
						);
						editorWindow.open();
					});
			});
	}

	private noteCountLimit() {
		new Setting(this.containerEl)
			.setName('笔记划线数量最小值')
			.setDesc('划线数量小于该值的笔记将不会被同步')
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						'-1': '无限制',
						'3': '3条',
						'5': '5条',
						'10': '10条',
						'15': '15条',
						'30': '30条'
					})
					.setValue(get(settingsStore).noteCountLimit.toString())
					.onChange(async (value) => {
						console.log('[weread plugin] new note count limit', value);
						settingsStore.actions.setNoteCountLimit(+value);
					});
			});
	}

	private showDebugHelp() {
		const info = this.containerEl.createDiv();
		info.setAttr('align', 'center');
		info.setText(
			'查看控制台日志: 使用以下快捷键快速打开控制台，查看本插件以及其他插件的运行日志'
		);

		const keys = this.containerEl.createDiv();
		keys.setAttr('align', 'center');
		keys.style.margin = '10px';
		if (Platform.isMacOS === true) {
			keys.createEl('kbd', { text: 'CMD (⌘) + OPTION (⌥) + I' });
		} else {
			keys.createEl('kbd', { text: 'CTRL + SHIFT + I' });
		}
	}

	private showEmptyChapterTitleToggle(): void {
		new Setting(this.containerEl)
			.setName('展示空白章节标题？')
			.setDesc('如果启用，则章节内没有划线也将展示章节标题')
			.setHeading()
			.addToggle((toggle) => {
				return toggle
					.setValue(get(settingsStore).showEmptyChapterTitleToggle)
					.onChange((value) => {
						console.debug('set empty chapter title toggle to', value);
						settingsStore.actions.setEmptyChapterTitleToggle(value);
						this.display();
					});
			});
	}

	private showLoginMethod(): void {
		new Setting(this.containerEl).setName('登录方式').addDropdown((dropdown) => {
			dropdown.addOptions({
				scan: '扫码登录',
				cookieCloud: 'CookieCloud登录'
			});
			return dropdown.setValue(get(settingsStore).loginMethod).onChange(async (value) => {
				console.debug('set login method to', value);
				settingsStore.actions.setLoginMethod(value);
				settingsStore.actions.clearCookies();
				this.display();
			});
		});
	}

	private showCookieCloudInfo(): void {
		const isCookieValid = get(settingsStore).isCookieValid;
		let name = '配置 CookieCloud';
		if (isCookieValid) {
			name = `微信读书已登录，用户名：  ${get(settingsStore).user}`;
		}

		new Setting(this.containerEl).setName(name).addButton((button) => {
			return button.setIcon('settings-2').onClick(async () => {
				button.setDisabled(true);
				const configModel = new CookieCloudConfigModal(this.app, this);
				configModel.open();
				this.display();
			});
		});
	}

	private customTagSetting(): void {
		new Setting(this.containerEl)
			.setName('自定义标签')
			.setDesc(
				'为所有导出的笔记添加一个自定义标签，可用于分类或自动化处理，可以使用模板中的变量，例如{{metaData.title}}等，需要在前面加上metaData'
			)
			.addText((input) => {
				input
					.setPlaceholder('如：#微信读书/{{metaData.title}}')
					.setValue(get(settingsStore).customTag || '')
					.onChange((value: string) => {
						settingsStore.actions.setCustomTag(value);
					});
			});
	}

	private customTagSetting(): void {
		new Setting(this.containerEl)
			.setName('自定义标签')
			.setDesc(
				'为所有导出的笔记添加一个自定义标签，可用于分类或自动化处理，可以使用模板中的变量，例如{{metaData.title}}等，需要在前面加上metaData'
			)
			.addText((input) => {
				input
					.setPlaceholder('如：#微信读书/{{metaData.title}}')
					.setValue(get(settingsStore).customTag || '')
					.onChange((value: string) => {
						settingsStore.actions.setCustomTag(value);
					});
			});
	}
}
