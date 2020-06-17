$.fn.extend({
	ncTable : function(option){
		var proto = this.constructor.prototype;
		var ncTable = new __ncTable(option);
		
		ncTable.$table = this;
		
		if(proto.innerMap && proto.innerMap[this.selector]){
			ncTable._tableHeadHTML = proto.innerMap[this.selector].headHTML;
		}
		ncTable.create();
		
		if(!proto.innerMap){
			proto.innerMap = {};
		}
		proto.innerMap[this.selector] = {
		    table: ncTable,
		    headHTML: ncTable._tableHeadHTML
		}
		this.constructor.prototype.getNcTable = function(){
			var selector = this.attr("innerId");
			return this.constructor.prototype.innerMap[selector].table;
		};
		if(option && option.complete){
			option.complete.call(this);
		}
		
		this.attr("innerId", this.selector);
		
		return ncTable;
	}
});

function __ncTable(option){
	this.option = option?option:{};
	
	var myself = this;
	
	//创建table结构
	this.create = function(){
		this._columns = [];
		this._fixedCols = [];
		
		this._reset();
		this._parseNcAttr();
		
		if(!this.option.onselectstart){
			this.$table.attr("onselectstart","return false");
		}
		
		this.$table.find(".ncTableBody:first").css({"overflow":"auto"});
		this.$head = this.$table.find(".ncTableHead:first");
		
		//数据行宽
		this._rowWidth = 0;
		//固定列款
		this._fixedColWidth = 0;
		
		if(!this._tableHeadHTML){
			this._tableHeadHTML = this.$table.find(".ncTableHead:first").html();
		}else{
			this.$table.find(".ncTableHead:first").html(this._tableHeadHTML);
		}
		
		var sumW = 0;
		var $hItems = this.$head.find(".ncTableRow:first>.ncTableHeadItem");
		$hItems.each(function(){
			var $this = $(this),
			    w = $this.attr("nc-width"),
			    hidden = $this.attr("nc-hidden");
			if(hidden) return;
			sumW += w?Number(w):0;
		});
		
		if(sumW < this.$head.width()){
			//增加填充列
			var $hRows = this.$table.find(".ncTableHead:first>.ncTableRow");
			$hRows.each(function(){
				var $this = $(this);
				$this.append('<div class="ncTableHeadItem fillCol" nc-width="20" name="__fillCol__"></div>');
			});
		}
		
		//获取列的定义
		var $items = this.$table.find(".ncTableHead:first>.ncTableRow>.ncTableHeadItem");
		if($items.length > 0){
			for(var i=0;i<$items.length;i++){
				var $item = $($items[i]);
				if($item.html() == ""){
					$item.html("&nbsp;");
				}
				
				//是否冻结该列，冻结列只能从左到右依次冻结，不能间隔
				var fixed = $item.attr("nc-fixed")=="true"?true:false;
				var hidden = $item.attr("nc-hidden")=="true"?true:false;
				
				//获取搜索下拉框的值
				var searchVals = $item.attr("nc-search-vals");
				if(searchVals && searchVals.indexOf("javascript:") == 0 && searchVals.length > 11){
					searchVals = searchVals.substr(11, searchVals.length - 11);
					searchVals = eval(searchVals);
				}
				
				var n = $item.attr("name");
				if(!n){
					$item.attr("name", Math.round(Math.random()*1000));
				}
				
				var col = {"name":$item.attr("name")?$item.attr("name"):"", 
						   "type":$item.attr("nc-type"),
						   "width":$item.attr("nc-width"), 
						   "align":$item.attr("nc-align"),
						   "hidden":hidden,
						   "search":$item.attr("nc-search"),
						   "searchType":$item.attr("nc-search-type"),
						   "searchValues":searchVals,
						   "mergeSign":$item.attr("nc-merge-sign"),
						   "class":$item.attr("class"),
						   "ref":$item
						  };
				
				if(fixed){
					this._fixedCols.push(col);
					this._fixedColWidth += Number(col.width?col.width:"30");
				}else{
					this._columns.push(col);
					if(!hidden){
						this._rowWidth += Number(col.width?col.width:"60");
					}
				}
			}
		}
		
		var search = false;
		
		//非固定列
		if(this._columns.length > 0){
			var hWidth = this.$head.width(),
			    sw = hWidth > this._rowWidth ? hWidth : this._rowWidth,
			    minus = hWidth - this._rowWidth;
		    
			for(var i=0;i<this._columns.length;i++){
				var col = this._columns[i],
				    $item = col.ref;
				//填充列
				if(col["class"].indexOf("ncTableHeadItem fillCol") > -1){
					if(minus > 0){
						$item.css({width:this._inMethods.getWidthPercent(minus, sw)});
					}else{
					}
				}else{
					$item.css({width:this._inMethods.getWidth(col, {sumWidth:sw})});
				}
				
				if(col.hidden){
					$item.addClass("hidden");
				}
				
				if(col.search == "true"){
					search = true;
				}
			}
			
			this.$table.find(".ncTableHead:first>.ncTableRow").css({width:sw + "px"});
		}
		
		//固定列
		if(this._fixedCols.length > 0){
			var $fixedRowHead = $("<div class='ncTableRowHeadHead'><div class='ncTableRow'></div></div>");
            for(var j=0;j<this._fixedCols.length;j++){
            	var col = this._fixedCols[j];
            	var $item = col.ref;
            	if(col.hidden){
					$item.addClass("hidden");
				}
            	var colWid = $item.attr("nc-width")?Number($item.attr("nc-width")):30;
            	var $itemClone = $item.clone();
            	$itemClone.css({width:this._inMethods.getWidth(col, {sumWidth:this._fixedColWidth})});
            	$fixedRowHead.find(".ncTableRow").append($itemClone);
            	$item.remove();
            }		
            
            fixedItems = null;
            
            if(this.$table.find(".ncTableTitle:first").length > 0){
            	this.$table.find(".ncTableTitle:first").after($fixedRowHead);
            }else{
            	this.$table.prepend($fixedRowHead);
            }
            
            this._resize("create");
		}
		
		//加入列搜索功能
		if(search){
			this._addSearchRow();
		}
		
		//设置分页组件
		this._createPageComponent();
		this._bindEvent("create");
		
		this.setHeight(300);
	}
	
	//加入搜索行
	this._addSearchRow = function(){
		var $head = this.$table.find(".ncTableHead:first"),
		    width = $head.find(".ncTableRow").width();
		
		var $search = $("<div class='ncTableRow search'></div>");
		$search.css({"width":width + "px"});
		$head.append($search);
		for(var i=0;i<this._columns.length;i++){
			var col = this._columns[i];
			var $item = col.ref.clone();
			$item.html("&nbsp;");
			$search.append($item);
			if(!col.search || col.search == "false") continue;
			if(col.searchType == "select"){
				var $select = $("<select></select>");
				$item.html($select);
				if(col.searchValues){
					var vals = this._parseSearchVals(col.searchValues);
					for(var j=0;j<vals.length;j++){
						$select.append("<option value='"+vals[j].code+"'>"+vals[j].display+"</option>");
					}
				}
			}else if(col.searchType == "button"){
				$item.html("<button class='searchNcButton'>"+(col.searchValues?col.searchValues:"&nbsp;")+"</button>");
			}else{
				$item.html("<input type='text'/>");
			}
		}
		
		var $rowHeadHead = this.$table.find(".ncTableRowHeadHead:first");
	    if($rowHeadHead.length > 0){
	    	var $row = $rowHeadHead.find(".ncTableRow");
	    	$row = $row.clone();
	    	$row.find(".ncTableHeadItem").html("");
	    	$rowHeadHead.append($row);
	    	$row.addClass("search");
	    	$row.css({"height":this._inMethods.getElementHeight($search)});
	    }
	    
	    $search = $rowHeadHead.find(".ncTableRow.search");
	    
	    for(var i=0;i<this._fixedCols.length;i++){
			var col = this._fixedCols[i];
			if(!col.search) continue;
			var $item = $search.find(".ncTableHeadItem[name='"+col.name+"']");
			if(col.searchType == "select"){
				var $select = $("<select></select>");
				$item.html($select);
				if(col.searchValues){
					var vals = this._parseSearchVals(col.searchValues);
					for(var j=0;j<vals.length;j++){
						$select.append("<option value='"+vals[j].code+"'>"+vals[j].display+"</option>");
					}
				}
			}else if(col.searchType == "button"){
				$item.html("<button class='searchNcButton'>"+(col.searchValues?col.searchValues:"&nbsp;")+"</button>");
			}else{
				$item.html("<input type='text'/>");
			}
		}
	}
	
	//解析下拉框搜索条件值
	this._parseSearchVals = function(vals){
		if(Object.prototype.toString.call(vals) === '[object Array]'){
			return vals;
		}else{
			var result = [];
			var valArr = vals.split(",");
			for(var i=0;i<valArr.length;i++){
				var val = valArr[i].split(":");
				result.push({code:val[0], display:val[1]});
			}
			return result;
		}
	}
	
	//获取行的最大宽度
	this._getRowMaxWidth = function(){
		return this._rowWidth+"px";
	}
	
	//创建分页组件
	this._createPageComponent = function(){
		if(this._getPageRel().length == 0) return;
		var pageOption = "";
		if(this.option && this.option.pageList){
			var pageList = this.option.pageList;
			for(var i=0;i<pageList.length;i++){
				pageOption += '<option value="'+pageList[i]+'">'+pageList[i]+'</option>';
			}
		}else{
			pageOption = '<option value="10">10</option>' +
				         '<option value="20">20</option>' +
				         '<option value="50">50</option>' +
				         '<option value="100">100</option>';
		}
		var pageHTML = '<div class="ncPagerArea" style="width:25%;">' +
				       '<select class="ncPagerInput middle ncPageRows">' +
				           pageOption +
				       '</select>' +
				       '</div>' +
				       '<div class="ncPagerArea center" style="width:50%;">' +
				           '<div class="ncPagerFirst" title="首页"><i class="fa fa-step-backward"></i></div>' +
			               '<div class="ncPagerPrev" title="上一页"><i class="fa fa-backward"></i></div>' +
					       '<input class="ncPagerInput ncPageNum" />&nbsp;&nbsp;共 <span class="ncPageTotal"></span> 页' +
					       '<div class="ncPagerNext" title="下一页"><i class="fa fa-forward"></i></div>' +
					       '<div class="ncPagerLast" title="末页"><i class="fa fa-step-forward"></i></div>' +
					   '</div>' +
					   '<div class="ncPagerArea right" style="width:25%;">' +
					       '<div><span class="ncPageRowRange">1-20</span>&nbsp;&nbsp;共 <span class="ncPageRecords"></span> 条</div>' +
					   '</div>';
		this._getPageRel().html(pageHTML);
	}
	
	//获取搜索列的参数
	this._getSearchParam = function(){
		var param = {};
		var $row = this.$table.find(".ncTableHead:first>.ncTableRow.search,.ncTableRowHeadHead>.ncTableRow.search");
		var $eles = $row.find("input,select");
		for(var i=0;i<$eles.length;i++){
			var $ele = $($eles[i]);
			if($ele.val() != null && $ele.val().length > 0){
				var name = $ele.parent().attr("name");
				param[name] = $ele.val();
			}
		}
		return param;
	}
	
	//解析NC属性
	this._parseNcAttr = function(){
		//列表头定义的属性集合
		this._headAttrs = {};
		var $head = this.$table.find(".ncTableHead:first");
		//合并列名称
		var mergeName = $head.attr("nc-merge-names");
		//合并符号
		this._headAttrs.mergeSign = "";
		if(mergeName){
			this._headAttrs.mergeNames = mergeName.split(",");
			this._headAttrs.mergeSignName = $head.attr("nc-merge-sign");
			this._headAttrs.mergeSign = "<div class='nc-merge-col'></div>";
			this._headAttrs.mergeSigns = ["┏","┠","┗"];
		}
		//选择模式 single单选 multiple 多选
		this._headAttrs.selectType = $head.attr("nc-select-type");
		//分组列
		this._headAttrs.groupName = $head.attr("nc-group-name");
		this._headAttrs.groupSort = $head.attr("nc-group-sort");
		
		this._headMethods = {
			//提取分组信息
			getGroupInfo : function(list){
				var la = this.linkAttr;
				
				var g = {
				    match:function(obj){
				    	var gn = la.groupName;
				    	if(!gn) return;
				    	
				    	var gnd = this[gn];
				    	if(!gnd) return;
				    	
				    	var val = obj[gn];
				    	
				    	for(var i = 0;i < gnd.length;i++){
				    		if(gnd[i].value == val && !gnd[i].setGroup){
				    			gnd[i].setGroup = true;
				    			return true;
				    		}
				    	}
				    	return false;
					}
				};
				
				if(!la.groupName) return g;
				
				var n = la.groupName;
				if(la.groupSort == "desc"){
					list.sort(function(a, b){
						return a[n] == b[n] ? 0 : a[n] > b[n] ? -1 : 1;
					});
				}else {
					list.sort(function(a, b){
						return a[n] == b[n] ? 0 : a[n] > b[n] ? 1 : -1;
					});
				}
				
				g[n] = [];
				var t = {};
				
				for(var j=0;j<list.length;j++){
					var d = list[j][n];
					if(!t[d]){
						g[n].push({value : d});
						t[d] = true;
					}
				}
				
				return g;
			}
		};
		this._headMethods.linkAttr = this._headAttrs;
	}
	
	//重置表格所有内容
	this._reset = function(){
		this.$table.find(".ncTableHead:first>.ncTableRow.search").remove();
		this.$table.find(".ncTableRowHead:first").remove();
		this.$table.find(".ncTableRowHeadHead:first").remove();
		this.$table.find(".ncTableBody:first").html("");
		this._getPageRel().html("");
	}
	
	this._deepClone = function(obj){
	    if (null == obj || "object" != typeof obj) return obj;
	    if (obj instanceof Date) {
	        var copy = new Date();
	        copy.setTime(obj.getTime());
	        return copy;
	    }
	    if (obj instanceof Array) {
	        var copy = [];
	        for (var i = 0; i < obj.length; i++) {
	            copy[i] = clone(obj[i]);
	        }
	        return copy;
	    }
	    if (obj instanceof Object) {
	        var copy = {};
	        for (var attr in obj) {
	            if (obj.hasOwnProperty(attr)) copy[attr] = this._deepClone(obj[attr]);
	        }
	        return copy;
	    }
	}
	
	//增加本地数据
	this.addLocalData = function(list){
		this.beginUpdate();
		
		this._cache_data = list;
		
		//开始插入数据
		for(var i=0;i<list.length;i++){
			this.addRow(list[i]);
		}
		
		if(!list || list.length == 0){
			this.endUpdate({fail:true, msg:"没有查询到数据"});
		}else{
			this.endUpdate();
		}
	}
	
	//加载数据
	this.loadData = function(url, param, option){
		if(url){
		    this.url = url;	
		}
		
		if(option){
			this.option = this._mergeOption(this.option, option);
		}
		
		if(param){
			this._loadDataParam = param;
		}
		
		var postData = this._loadDataParam;
		
		if(this._getPageRel().length > 0){
			postData = $.extend(this._loadDataParam, {page:myself._getCurrentPage(), rows:myself._getCurrentPageRow()})
		}
		
		//合并搜索参数
		if(this.option.mergeSearchParam){
			postData = this.option.mergeSearchParam.call(this, this._deepClone(postData), this._getSearchParam());
		}else{
			postData = $.extend(postData, this._getSearchParam());
		}
		
		this.beginUpdate();
		
		$.ajax({
			data : postData,
			type : "post",
			url : this.url,
			dataType : "json",
			success : function(data) {
				myself.beginUpdate();
				
				if(data){
					var list = data.gridResult?data.gridResult:data;
					
					var gInfo = myself._headMethods.getGroupInfo(list);
					var dg = myself.option.dataGroup;
					
					if(list.length > 0){
						myself._cache_data = list;
						
						//开始插入数据
						for(var i=0;i<list.length;i++){
							var item = list[i];
							if(gInfo.match(item)){
								myself.addGroupRow(item, dg ? dg.formatter(item) : "");
							}
							myself.addRow(item);
						}
						myself.endUpdate();
					}else{
						myself.endUpdate({fail:true, msg:"没有查询到数据"});
					}
					//设置分页数据
					myself._setPage(data);
				}else{
					myself.endUpdate({fail:true, msg:"没有查询到数据"});
				}
				
				if(myself.option && myself.option.loadComplete){
					myself.option.loadComplete.call(myself);
				}
			}
		});
	}
	
	//合并选项
	this._mergeOption = function(optionOld, optionNew){
		return $.extend(optionOld, optionNew);
	}
	
	//开始更新数据
	this.beginUpdate = function(){
		this._lockRequest = true;
		this.$table.find(".ncTableRowHead:first").html("");
		this.$table.find(".ncTableBody:first").html("");
		this.$table.find(".nc-loading:first").remove();
		this.$table.find(".nc-fail:first").remove();
		var $loading = $("<div class='nc-loading' width='float:left;width:180px;'><i style='color:#608fb7;' class='fa fa-spinner fa-pulse'></i>&nbsp;正在查询，请稍候...</div>");
		this.$table.append($loading);
		var top = (this.$table.height()-$loading.height())/2;
		top = top < 0 ? this.$table.find(".ncTableHead:first").height()+100 : top;
		$loading.css({"left":(this.$table.width()-$loading.width())/2+"px", "top":top+"px"});
		this._cacheRowHTML = "";
		this._cache_data = null;
		this._fixedColHTML = "";
		this._rowcount = 0;
	}
	
	//增加行
	this.addRow = function(item){
		this._rowcount++;
		this._cacheRowHTML = this._cacheRowHTML?this._cacheRowHTML:"";
		this._fixedColHTML = this._fixedColHTML?this._fixedColHTML:"";
		
		this._fixedColHTML += '<div class="ncTableRow" nc-index={index}>';
		
		//创建冻结列
		if(this._fixedCols && this._fixedCols.length > 0){
			var index = this._fixedCols[0].index;
			this._fixedColHTML = this._fixedColHTML.replace("{index}", this._rowcount);
			for(var i=0;i<this._fixedCols.length;i++){
				var fixedCol = this._fixedCols[i];
				this._fixedColHTML += this._buildBodyItem(fixedCol, item, {sumWidth: this._fixedColWidth, rowid:this._rowcount});
			}
		}
		
		this._fixedColHTML += "</div>";
		
		//创建非冻结列
		var style = [];
		
		var hWidth = this.$head.width();
		var sw = hWidth > this._rowWidth ? hWidth : this._rowWidth;
		style.push("width:" + sw + "px");
		
		if(this.option.style && this.option.style.row){
			var s = this.option.style.row(item);
			style.push(s?s:"");
		}
		this._cacheRowHTML += '<div class="ncTableRow" nc-index={index} style="'+style.join(";")+'">';
		
        if(this._columns && this._columns.length > 0){
        	var index = this._columns[0].index;
        	this._cacheRowHTML = this._cacheRowHTML.replace("{index}", this._rowcount);
        	for(var i=0;i<this._columns.length;i++){
        		var col = this._columns[i];
        		var minus = hWidth - this._rowWidth;
        		if(col["class"] == "ncTableHeadItem fillCol"){
        			if(minus > 0){
        				col.width = minus;
        				col.hidden = false;
            			this._cacheRowHTML += this._buildBodyItem(col, item, {sumWidth: sw, rowid:this._rowcount});
        			}else{
        			}
        		}else{
        			this._cacheRowHTML += this._buildBodyItem(col, item, {sumWidth: sw, rowid:this._rowcount});
        		}
        	}
		}
        
        this._cacheRowHTML += '</div>';
	}
	
	//增加分组行
	this.addGroupRow = function(item, html){
		var n = item[this._headAttrs.groupName];
		
		this._cacheRowHTML = this._cacheRowHTML?this._cacheRowHTML:"";
		this._fixedColHTML = this._fixedColHTML?this._fixedColHTML:"";
		
		//创建冻结列
		if(this._fixedCols && this._fixedCols.length > 0){
			this._fixedColHTML += '<div class="ncTableRow groupFix" nc-group-value="'+n+'"><span>组</span></div>';
		}
		
		var hWidth = this.$head.width(),
		    sw = hWidth > this._rowWidth ? hWidth : this._rowWidth, 
		    minus = hWidth - this._rowWidth,
		    w = "100%", w2 = 0;
		    
		if(minus > 0){
			var $items = this.$head.find(".ncTableRow:first>.ncTableHeadItem:not(.hidden,.fillCol)");
			w = this._inMethods.getWidthPercent(this._inMethods.sumWidth($items), hWidth);
			w2 = this._inMethods.getWidthPercent(minus, hWidth);
		}
		
		var style = [];
		style.push("width:" + sw + "px");
		
		//创建非冻结列
		var style = 'style="' + style.join(";") + '"';
		
        if(this._columns && this._columns.length > 0){
        	this._cacheRowHTML += '<div class="ncTableRow group" nc-group-value="'+n+'" '+style+'>' +
        	                          '<div class="ncTableBodyItem" style="width:'+w+';">' +
		        	                      '<span class="ncCaret">' +
		        	                          '<a class="ncCaretLink" nc-group-value="'+n+'"><i class="fa fa-caret-right"></i></a>' +
		        	                      '</span>' +
		        	                      '<span class="groupContent">'+(html?html:n)+'</span>' +
		        	                   '</div>' +
		        	                   (minus > 0 ? '<div class="ncTableBodyItem fillCol" style="width:'+w2+';"></div>' : '') +
        	                      '</div>';
		}
        
	}
	
	//构建单元格
	this._buildBodyItem = function(col, item, opt){
		var clazz = col["class"].indexOf("fillCol") > -1 ? "ncTableBodyItem fillCol" : "ncTableBodyItem";
		var html = '<div class="' + clazz + (col.hidden?" hidden":"") + '" ' +
			       this._getStyle(col, opt) + ' ' + (col.name?('name="' + col.name + '" '):'');
		
		if(col.type){
			if(col.type == "custom"){
				html += '>';
				if(this.option.custom && this.option.custom[col.name]){
					html += this.option.custom[col.name].formatter.call(this, item[col.name], opt.rowid, item);
				}
			}else if(col.type == "attrRowIndex"){
				html += ' nc-type="attrRowIndex">';
				html += this._rowcount;
			}else if(col.type == "attrCheckBox"){
				html += ' nc-type="attrCheckBox">';
				html += '<input type="checkbox" />';
			}else if(col.type == "attrSubGrid"){
				html += ' nc-type="attrSubGrid">';
				html += '<a class="attrSubGrid"><i class="fa fa-caret-right"></i></a>';
			}
		}else{
			var val = item[col.name];
			html += 'title="'+val+'">';
			var content = (val || typeof(val) === "number")?item[col.name]:"&nbsp;";
			html += content;
		}
		
		html += '</div>';
		
		return html;
	}
	
	//获取样式
	this._getStyle = function(col, opt){
		var style = "";
		if(col.width){
			style += 'width:'+ this._inMethods.getWidth(col, opt) + ';';
		}
		if(col.align){
			if(col.align == "left"){
				style += 'text-align:left;';
			}else if(col.align == "center"){
				style += 'text-align:center;';
			}else if(col.align == "right"){
				style += 'text-align:right;';
			}
		}
		if(style.length > 0){
			return 'style="'+style+'"';
		}
		return style;
	}
	
	//结束更新数据
    this.endUpdate = function(opt){
    	this.$table.find(".nc-loading:first").remove();
    	if(opt && opt.fail){
    		//设置body内容
    		var $fail = $("<div class='nc-fail'><i style='color:#608fb7;' class='fa fa-exclamation-circle'></i>&nbsp;"+opt.msg+"</div>");
    		this.$table.find(".nc-fail").remove();
    		this.$table.append($fail);
        	$fail.css({"left":(this.$table.width()-$fail.width())/2+"px", "top":(this.$table.height()-$fail.height())/2+"px"});
    	
        	var $nullRow = $("<div class='ncTableEmptyRow'></div>");
			$nullRow.width(this.$table.find(".ncTableHead:first>.ncTableRow").width());
			$nullRow.height(this.$table.find(".ncTableBody:first").height());
			this.$table.find(".ncTableBody:first").find(".ncTableEmptyRow").remove();
			this.$table.find(".ncTableBody:first").append($nullRow);
    	}else{
    		var $cacheRow = $(this._cacheRowHTML);
        	$cacheRow.hide();
        	
        	//设置body内容
        	this.$table.find(".ncTableBody:first").html($cacheRow);
        	//构建rowHead
        	this._buildRowHead();
        	
        	$cacheRow.show();
        	
        	//绑定加载后各元素事件
        	this._bindEvent("load");
        	this._cacheRowHTML = "";
        	
        	this._groupExpandOrCollpaseAll(false);
    	}
    	this._lockRequest = false;
	}
    
    //插入子表
    this.insertSubGrid = function(html, rowid){
    	var $subGrid = $("<div class='ncTableRowSubGrid'></div>");
    	if(typeof(html)=='string'){
    		$subGrid.html(html);
    	}else{
    		$subGrid.append(html);
    	}
    	
    	var $r = this.$table.find(".ncTableBody:first>.ncTableRow[nc-index='"+rowid+"']");
    	$r.find(".ncTableRowSubGrid").remove();
    	$r.append($subGrid);
    	$r.css({height:"auto"});
    	
    	this.$table.find(".ncTableRowHead:first>.ncTableRow[nc-index='"+rowid+"']").height($r.height());
    }
    
    //移除字表
    this._removeSubGrid = function(rowid){
    	var $r = this.$table.find(".ncTableBody:first>.ncTableRow[nc-index='"+rowid+"']");
    	$r.find(".ncTableRowSubGrid").remove();
    	
    	this.$table.find(".ncTableRowHead:first>.ncTableRow[nc-index='"+rowid+"']").height($r.height());
    }
    
    //构建rowHead
    this._buildRowHead = function(){
    	this.$table.find(".ncTableRowHead:first").remove();
    	if(this._fixedColWidth && this._fixedColWidth > 0){
    		this._fixedColHTML = "<div class='ncTableRowHead'>" + this._fixedColHTML + "</div>";
    		var $rowHead = $(this._fixedColHTML);
    		$rowHead.hide();
        	this.$table.find(".ncTableHead:first").after($rowHead);
        	this._resize("load");
        	this.setHeight();
        	$rowHead.show();
    	}
    }
    
    //重新设置各组件位置
    this._resize = function(type, opt){
    	var tableWidth = this._inMethods.getElementWidth(this.$table, "border-box");
    	tableWidth = tableWidth > this._fixedColWidth ? tableWidth : (tableWidth + this._fixedColWidth);
    	if(type == "create"){
    		var $rowHeadHead = this.$table.find(".ncTableRowHeadHead:first");
    		$rowHeadHead.css({width: this._inMethods.getWidth({width:this._fixedColWidth},{sumWidth:tableWidth})});
            this.$table.find(".ncTableHead:first").css({width: this._inMethods.getWidth({width:(tableWidth-this._fixedColWidth)},{sumWidth:tableWidth})});
    	}else if(type == "load"){
            var $rowHead = this.$table.find(".ncTableRowHead:first");
            var $body = this.$table.find(".ncTableBody:first");
            
            $rowHead.css({width: this._inMethods.getWidth({width:this._fixedColWidth},{sumWidth:tableWidth})});
            $body.css({width: this._inMethods.getWidth({width:(tableWidth-this._fixedColWidth)},{sumWidth:tableWidth})});
            
            this._resize("create");
            
            if(!opt || !opt.notAjustRowHeight){
            	//调整高度
                var $bodyRow = $body.find(".ncTableRow");
                var $headRow = $rowHead.find(".ncTableRow");
                for(var i=0;i<$bodyRow.length;i++){
                	var $br = $($bodyRow[i]);
                	var $hr = $($headRow[i]);
                	
                	if(this._headAttrs.mergeNames){
                		if(i > 0){
    	            		var $br1 = $($bodyRow[i-1]);
    	            		var $hr1 = $($headRow[i-1]);
                    		this._setMergeSignByRow($br1, $br, $hr1, $hr, i == $bodyRow.length-1);
                		}
                	}
                	
                	if(this.option.rowHeight){
                		$br.css({height:this.option.rowHeight+"px"});
                    	$hr.css({height:this.option.rowHeight+"px"});
                	}else{
                		var ht = Math.ceil(this._inMethods.px2Num($br.css("height")));
                		ht = ht?ht:"32";
                    	$br.css({height:ht+"px"});
                    	$hr.css({height:ht+"px"});
                	}
                }
            }
    	}
    }
    
    //外部调用的resize方法
    this.resize = function(){
    	this._resize("load", {notAjustRowHeight:true});
    }
    
    //从tableHeadRow和tableBody中各抽出两行对指定列进行比较，判断值是否相等
    this._allColValEqual = function($bodyRow1, $bodyRow2, $headRow1, $headRow2, colNames){
    	for(var i=0;i<colNames.length;i++){
    		var $bItem1 = $bodyRow1.find(".ncTableBodyItem[name='"+colNames[i]+"']");
    		var $bItem2 = $bodyRow2.find(".ncTableBodyItem[name='"+colNames[i]+"']");
    		
    		var flg1 = $bItem1.attr("title") && $bItem2.attr("title") && ($bItem1.attr("title") == $bItem2.attr("title"));
    		
    		var $hItem1 = $headRow1.find(".ncTableBodyItem[name='"+colNames[i]+"']");
    		var $hItem2 = $headRow2.find(".ncTableBodyItem[name='"+colNames[i]+"']");
    		
    		var flg2 = $hItem1.attr("title") && $hItem2.attr("title") && ($hItem1.attr("title") == $hItem2.attr("title"));
    		
    		if(!(flg1 || flg2)){
    			return false;
    		}
    	}
    	return true;
    }
    
    //根据列名判断某行是否包含该列
    this._hasColumn = function($row, colName){
		var $item = $row.find(".ncTableBodyItem[name='"+colName+"']");
		if($item.length > 0){
			return $item;
		}
		return null;
    }
    
    //从tableHeadRow和tableBody中各抽出两行进行比较，根据结果来设置合并符号
    this._setMergeSignByRow = function($bodyRow1, $bodyRow2, $headRow1, $headRow2, lastRow){
    	var $item1 = this._hasColumn($bodyRow1, this._headAttrs.mergeSignName);
    	var $item2 = this._hasColumn($bodyRow2, this._headAttrs.mergeSignName);
    	
    	$item1 = $item1?$item1:this._hasColumn($headRow1, this._headAttrs.mergeSignName);
    	$item2 = $item2?$item2:this._hasColumn($headRow2, this._headAttrs.mergeSignName);
    	
    	if($item1.find(".nc-merge-col").length == 0){
    		$item1.html(this._headAttrs.mergeSign);
    	}
    	if($item2.find(".nc-merge-col").length == 0){
    		$item2.html(this._headAttrs.mergeSign);
    	}
    	
		if(this._allColValEqual($bodyRow1, $bodyRow2, $headRow1, $headRow2, this._headAttrs.mergeNames)){
			if(this._getMergeSignIndex($item1, this._headAttrs.mergeSignName) == 1){
				this._setMergeSign($item1, 1);
			}else{
				this._setMergeSign($item1, 0);
			}
			if(lastRow){
				this._setMergeSign($item2, 2);
			}else{
				this._setMergeSign($item2, 1);
			}
		}else{
			if(this._getMergeSignIndex($item1, this._headAttrs.mergeSignName) == 1){
				this._setMergeSign($item1, 2);
			}
		}
    }
    
    //设置某行指定列的合并符号
    this._setMergeSign = function($item, i){
    	$item.find(".nc-merge-col").html(this._headAttrs.mergeSigns[i]);
    }
    
    //获取某行指定列的符号序号
    this._getMergeSignIndex = function($item, name){
    	var sign = $item.find(".nc-merge-col").html();
    	for(var i=0;i<this._headAttrs.mergeSigns.length;i++){
    		if(sign == this._headAttrs.mergeSigns[i]) return i;
    	}
    	return -1;
    }
    
    //设置高度
	this.setHeight = function(height){
		if(height){
			this._dataHeight = height;
		}
		this._dataHeight = this._dataHeight?this._dataHeight:"300";
		var fixHeight = this._inMethods.getElementHeight(this.$table.find(".ncTableTitle:first")) +
						this._inMethods.getElementHeight(this.$table.find(".ncTableHead:first")) + 
						this._inMethods.getElementHeight(this._getPageRel());
		var minusHeight = this._dataHeight - fixHeight;
		
		var $body = this.$table.find(".ncTableBody:first");
		$body.css({height:minusHeight});
		
		var $rowHead = this.$table.find(".ncTableRowHead:first");
		$rowHead.append("<div style='height:20px;float:left;'>&nbsp;</div>");
		$rowHead.css({height:minusHeight});
		
        $rowHead.css({"padding-bottom":"50px"});
        $body.css({"padding-bottom":"50px"});
	}
    
    //绑定事件
    this._bindEvent = function(type){
    	if(type == "load"){
    		var event = this.option && this.option.event?this.option.event:{};
    		
    		myself.action = myself.action?myself.action:{};
    		
    		//列头鼠标移动事件
    		var $tableHead = this.$table.find(".ncTableHead:first");
    		this.$headItems = $tableHead.find(".ncTableHeadItem");
    		$tableHead.unbind("mousedown");
    		$tableHead.bind("mousedown", function(e){
    			myself.$headItems.each(function(){
    				var $this = $(this);
    				var left = $this.offset().left + myself._inMethods.getElementWidth($this);
    				var top = $this.offset().top + myself._inMethods.getElementHeight($this);
    				if(e.pageX > left - 10 && e.pageX < left + 10 &&
    				   e.pageY > $this.offset().top && e.pageY < top){
    					myself.action.$dragHeadItem = $this;
    					return;
    				}
    			});
    			e.stopPropagation();
    		});
    		
    		$tableHead.unbind("mousemove");
    		$tableHead.bind("mousemove", function(e){
				var $this = $(this);
    			myself.$headItems.each(function(){
    				var $this = $(this);
    				var left = $this.offset().left + myself._inMethods.getElementWidth($this);
    				if(e.pageX > left - 10 && e.pageX < left + 10){
    					$this.css({cursor:"w-resize"});
    					return;
    				}
    				if(!myself.action.$dragHeadItem){
    					$this.css({cursor:"default"});
    				}
    			});
    			e.stopPropagation();
    		})
    		
    		$tableHead.unbind("mouseup");
    		$tableHead.bind("mouseup", function(e){
    			if(myself.action.$dragHeadItem){
    				var $this = $(this),
    				    //表头行
    				    $tr = $this.find(".ncTableRow:first"),
    				    //拖动列
    				    $dhi = myself.action.$dragHeadItem,
    				    //拖动列名
    				    name = $dhi.attr("name"),
    				    //拖动后列长度
    				    width = e.pageX - $dhi.offset().left,
    				    //拖动前长度
    				    dhiWidth = myself._inMethods.getElementWidth($dhi);
    				
    				//差控制不小于20
    				width = width < 20 ? 20 : width;
    				//前后长度差
				    var c = width - dhiWidth, 
				        hWidth = myself.$table.find(".ncTableHead:first").width(),
				        rWidth = $this.find(".ncTableRow").width(),
    				    trWidth = 0, calWidth = 0;
				    
				    trWidth = hWidth > rWidth ? hWidth : rWidth;
    				trWidth = c > 0 ? trWidth + c : trWidth;
    				    
    				var n2w = {};
    				
    				//统计列的宽度之和(拖动列、隐藏、填充列除外)
    				$tr.find(".ncTableHeadItem").each(function(){
    					var $item = $(this), iname = $item.attr("name");
    					if($item.attr("nc-hidden") == "true" || iname == name) return;
    					
						var w = $item.css("width"), clazz = $item.attr("class");
						
						w = myself._inMethods.px2Num(w);
						n2w[iname] = {width:w, clazz:clazz};
						
						//非填充列
						if(!myself._inMethods.isFillCol(clazz)){
							calWidth += Number(w);
						}
    				});
    				
    				$this.find(".ncTableRow").css({width:trWidth});
    				myself.$table.find(".ncTableBody:first>.ncTableRow").css({width:trWidth});
    				
    				var percent = "";
    				
    				//设置每列的宽度
    				for(var j in n2w){
    					var n = n2w[j];
    					//填充列
    					if(myself._inMethods.isFillCol(n.clazz)){
							n.width = trWidth - width - calWidth;
						}
    					percent = myself._inMethods.getWidthPercent(n.width, trWidth);
    					$this.find(".ncTableHeadItem[name='"+j+"']").css({width:percent});
    					myself.$table.find(".ncTableBody:first>.ncTableRow>.ncTableBodyItem[name='"+j+"']").css({width:percent});
    					myself._setColWidth(j, n.width);
    				}
    				
    				//设置拖动列宽度
    				percent = myself._inMethods.getWidthPercent(width, trWidth);
    				$this.find(".ncTableHeadItem[name='"+name+"']").css({width:percent});
    				myself.$table.find(".ncTableBody:first>.ncTableRow>.ncTableBodyItem[name='"+name+"']").css({width:percent});
    				myself._setColWidth(name, width);
    				
    				myself._rowWidth = trWidth;
    				
    				//设置分组行的宽度
    				if(myself._headAttrs.groupName){
    					var hWidth = myself.$head.width(),
	    				    sw = hWidth > myself._rowWidth ? hWidth : myself._rowWidth, 
	    				    minus = hWidth - myself._rowWidth;
    					var $items = myself.$head.find(".ncTableRow:first>.ncTableHeadItem:not(.hidden,.fillCol)");
    					
    					var w = myself._inMethods.getWidthPercent(myself._inMethods.sumWidth($items), sw);
    					var w2 = myself._inMethods.getWidthPercent(minus, sw);
	    				
    					var $gRows = myself.$table.find(".ncTableBody:first>.ncTableRow.group");
    					$gRows.each(function(){
    						var $this = $(this);
    						$this.find(".ncTableBodyItem:first").css({width:w});
    						$this.find(".ncTableBodyItem.fillCol").css({width:w2});
    					});
    				}
    			}
    			myself.action.$dragHeadItem = null;
    			e.stopPropagation();
    		})
    		
    		//行点击事件
    		var $rows = this.$table.find(".ncTableBody:first>.ncTableRow,.ncTableRowHead:first>.ncTableRow");
    		
    		$rows.unbind("mouseenter").unbind("mouseleave"); 
    		$rows.hover(function(e){
    			var index = Number($(this).attr("nc-index"));
    			myself._getRowRel(".ncTableRow[nc-index='"+index+"']").addClass("hover");
    			e.stopPropagation();
    		},function(e){
    			var index = Number($(this).attr("nc-index"));
    			myself._getRowRel(".ncTableRow[nc-index='"+index+"']").removeClass("hover");
    			e.stopPropagation();
    		});
    		
    		$rows.unbind("click");
    		$rows.click(function(e){
            	myself.$table.find(".ncTableBody:first>.ncTableRow").removeClass("focus");
            	myself.$table.find(".ncTableRowHead:first>.ncTableRow").removeClass("focus");
            	
            	var $this = $(this);
            	
            	var index = Number($this.attr("nc-index"));
            	myself.setCurrentRow(index);
        		
        		if(event.rowClick){
        			event.rowClick.call(myself, myself._cache_data[index-1]);
        		}
        		
        		if(event.cellClick){
        			var $items = $this.find(".ncTableBodyItem");
        			for(var i=0;i<$items.length;i++){
        				var $item = $($items[i]);
        				if(e.pageX > $item.offset().left && e.pageX < $item.offset().left + myself._inMethods.getElementWidth($item) &&
        				   e.pageY > $item.offset().top && e.pageY < $item.offset().top + myself._inMethods.getElementHeight($item)){
        					event.cellClick.call(myself, myself.getCurrentRowData(), $this.attr("nc-index"), $item.attr("name"));
        				}
        			}
        		}
        		e.stopPropagation();
        	});
            
    		$rows.unbind("dblclick");
    		$rows.dblclick(function(e){
            	var index = Number($(this).attr("nc-index"));
    			myself._currentRow = index;
    			
        		if(event.rowDoubleClick){
        			event.rowDoubleClick.call(myself, myself._cache_data[index-1]);
        		}
        		e.stopPropagation();
    		});
    		
    		this.$table.find("a.attrSubGrid").unbind("click")
    		this.$table.find("a.attrSubGrid").bind("click", function(e){
    			var $this = $(this);
    			$this.find("i").removeClass();
    			var rid = $this.parent().parent().attr("nc-index");
    			var evt = myself.option.event;
    			if($this.attr("isExpand") == "true"){
    				$this.attr("isExpand", "false");
    				$this.find("i").addClass("fa fa-caret-right");
    				myself._removeSubGrid(rid);
    				var subGridCollapse = evt?evt.subGridCollapse:null;
    				if(subGridCollapse){
    					subGridCollapse.call(myself, rid);
    				}
    			}else{
    				$this.attr("isExpand", "true");
    				$this.find("i").addClass("fa fa-caret-down");
    				var subGridExpand = evt?evt.subGridExpand:null;
    				if(subGridExpand){
    					subGridExpand.call(myself, rid, myself.getCurrentRowData(rid));
    				}
    			}
    			e.stopPropagation();
    		})
    		
    		this.$table.find("a.ncCaretLink").unbind("click")
    		this.$table.find("a.ncCaretLink").bind("click", function(e){
    			var $this = $(this), isExpand = !($this.attr("expand") == "true");
    			myself._groupExpandOrCollpase($this.attr("nc-group-value"), isExpand, $this.parent().parent());
    			$this.attr("expand", isExpand ? "true" : "false");
    		});
    		
    		this.$table.find(".ncTableRow.group").unbind("click")
    		this.$table.find(".ncTableRow.group").bind("click", function(e){
    			var $this = $(this), isExpand = !($this.attr("expand") == "true");
    			myself._groupExpandOrCollpase($this.attr("nc-group-value"), isExpand, $this);
    			$this.attr("expand", isExpand ? "true" : "false");
    		});
    	}else if(type == "create"){
    		//上一页点击事件
    		this._getPageRel(".ncPagerPrev:first").unbind("click");
    		this._getPageRel(".ncPagerPrev:first").click(function(e){
            	if(myself._lockRequest) return;
            	myself._currentPageMinus();
            	myself.loadData();
            	e.stopPropagation();
            });
            //下一页点击事件
    		this._getPageRel(".ncPagerNext:first").unbind("click");
    		this._getPageRel(".ncPagerNext:first").click(function(e){
            	if(myself._lockRequest) return;
            	myself._currentPagePlus();
            	myself.loadData();
            	e.stopPropagation();
            });
            //页码输入框
    		this._getPageRel(".ncPageNum:first").unbind("keydown");
    		this._getPageRel(".ncPageNum:first").keydown(function(event){
            	if(myself._lockRequest) return;
            	if(event.keyCode == 13){
        			if(myself._isNumber($(this).val())){
        				myself.loadData();
        			}else{
        				$(this).val(myself._getCurrentPage());
        			}
            	}
            	event.stopPropagation();
            });
    		//首页点击事件
    		this._getPageRel(".ncPagerFirst:first").unbind("click");
    		this._getPageRel(".ncPagerFirst:first").click(function(e){
            	if(myself._lockRequest) return;
            	myself._currentPageMinus(1);
            	myself.loadData();
            	e.stopPropagation();
            });
            //末页点击事件
    		this._getPageRel(".ncPagerLast:first").unbind("click");
    		this._getPageRel(".ncPagerLast:first").click(function(e){
            	if(myself._lockRequest) return;
            	myself._currentPagePlus(myself.pageTotal);
            	myself.loadData();
            	e.stopPropagation();
            });
            //每页行数下拉改变事件
    		this._getPageRel(".ncPageRows:first").unbind("change");
    		this._getPageRel(".ncPageRows:first").change(function(e){
            	if(myself._lockRequest) return;
            	myself.loadData();
            	e.stopPropagation();
            });
            
            //搜索事件
            var $searchRow = this.$table.find(".ncTableRowHeadHead:first>.ncTableRow.search,.ncTableHead:first>.ncTableRow.search");
            if($searchRow.length > 0){
            	//输入框回车事件
            	$searchRow.find("input").keydown(function(event){
            		if(myself._lockRequest) return;
            		if(event.keyCode == 13){
            			if(!myself.option.keepLoadParam){
            				myself._loadDataParam = {};
            			}
            			myself.loadData();
            		}
            		event.stopPropagation();
            	});
            	//下拉框选择事件
            	$searchRow.find("select").change(function(e){
            		if(myself._lockRequest) return;
            		if(!myself.option.keepLoadParam){
        				myself._loadDataParam = {};
        			}
            		myself.loadData();
            		e.stopPropagation();
            	});
            }
            
            //滚动条事件
        	this.$table.find(".ncTableBody:first").unbind("scroll");
        	this.$table.find(".ncTableBody:first").scroll(function(e){
        		var $head = myself.$table.find(".ncTableHead:first");
        		$head.scrollLeft($(this).scrollLeft());
        		/*var left = $head.scrollLeft();
        		if($(this).scrollLeft() > left){
        			$(this).scrollLeft(left);
        		}*/
        		
        		var $rowHead = myself.$table.find(".ncTableRowHead:first");
        		if($rowHead.length > 0){
        			$rowHead.scrollTop($(this).scrollTop());
            		/*var top = $rowHead.scrollTop();
            		if($(this).scrollTop() > top){
            			$(this).scrollTop(top);
            		}*/
        		}
        		e.stopPropagation();
        	});
    	}
    }
    
    //展开或收起所有组下的所有行
    this._groupExpandOrCollpaseAll = function(isExpand){
    	var $groupRows = this.$table.find(".ncTableRow.group");
    	$groupRows.each(function(){
    		var $this = $(this);
    		myself._groupExpandOrCollpase($this.attr("nc-group-value"), isExpand, $this);
    	});
    }
    
    //展开或收起同一组下的所有行
    this._groupExpandOrCollpase = function(groupVal, isExpand, $row){
    	var rowArr = [];
    	
    	var groupName = this._headAttrs.groupName;
		var cache = this._cache_data;
		var $next = $row.next();
	        index = Number($next.attr("nc-index"));
	    
    	if(this._fixedCols.length > 0){
    		rowArr.push(this._inMethods.getFixRow(index));
    	}
    	
    	rowArr.push($next);
    	
    	for(var i=0;i<rowArr.length;i++){
    		var $r = rowArr[i];
    		while(cache[index - 1][groupName] == groupVal){
    			if(isExpand){
    				$r.show();
    			}else{
    				$r.hide();
    			}
    			$r = $r.next();
    			
    			var ni = $r.attr("nc-index");
    			if(!ni) break;
    			index = Number($r.attr("nc-index"));
    		}
    	}
    	
    	$row.find("a.ncCaretLink>i").attr("class", isExpand ? "fa fa-caret-down" : "fa fa-caret-right");
    }
    
    //内部方法集合(后续代码重构，会将所有以下划线开头的方法，移到此处)
    this._inMethods = {
    	//获取固定行
    	getFixRow : function(index){
    		return myself.$table.find(".ncTableRowHead:first>.ncTableRow[nc-index='"+index+"']");
    	},
    	//是否是填充列
    	isFillCol : function(clazz){
    		return clazz == "ncTableHeadItem fillCol";
    	},
    	//获取宽度百分比
    	getWidthPercent : function(width, sumWidth){
    		return Math.floor((width/sumWidth)*10000)/100+"%";
    	},
    	//获取列宽
    	getWidth : function(column, opt){
    		if(opt && opt.sumWidth){
    			return Math.floor((column.width/opt.sumWidth)*10000)/100+"%";
    		}else{
    			return column.width+"px";
    		}
    	},
    	//汇总宽度
    	sumWidth : function($items){
    		var width = 0;
    		var my = this;
    		$items.each(function(){
    			var $this = $(this);
    			width += my.getElementWidth($this);
    		});
    		return width;
    	},
    	//获取元素高度
    	getElementHeight : function($ele, type){
    		if($ele.length > 0){
    			if(type == "border-box"){
    				return $ele.height() + this.px2Num($ele.css("padding-top")) + this.px2Num($ele.css("padding-bottom")) + 
    		           this.px2Num($ele.css("border-top-width")) + this.px2Num($ele.css("border-bottom-width"));
    			}else{
    				return $ele.height() + this.px2Num($ele.css("padding-top")) + this.px2Num($ele.css("padding-bottom")) + 
    		           this.px2Num($ele.css("margin-top")) + this.px2Num($ele.css("margin-bottom")) +
    		           this.px2Num($ele.css("border-top-width")) + this.px2Num($ele.css("border-bottom-width"));
    			}
    		}else{
    			return 0;
    		}
    	},
    	//获取元素宽度
    	getElementWidth : function($ele, type){
    		if($ele.length > 0){
    			if(type == "border-box"){
    				return $ele.width() - (this.px2Num($ele.css("border-left-width")) + this.px2Num($ele.css("border-right-width")) +
    				                       this.px2Num($ele.css("padding-left")) + this.px2Num($ele.css("padding-right")));
    			}else if(type == "padding"){
    				return $ele.width() + this.px2Num($ele.css("padding-left")) + this.px2Num($ele.css("padding-right")) + 
    				                      this.px2Num($ele.css("border-left-width")) + this.px2Num($ele.css("border-right-width"));
    			}else{
    				return $ele.width() + this.px2Num($ele.css("padding-left")) + this.px2Num($ele.css("padding-right")) + 
    		                              this.px2Num($ele.css("margin-left")) + this.px2Num($ele.css("margin-right")) + 
    		                              this.px2Num($ele.css("border-left-width")) + this.px2Num($ele.css("border-right-width"));
    			}
    		}else{
    			return 0;
    		}
    	},
    	//像素转数字
    	px2Num : function(px){
        	if(px && px.indexOf("px") > 0){
        		return Number(px.substring(0,px.indexOf("px")));
        	}
        	return Number(px);
        }
    }
    
    //设置列宽
    this._setColWidth = function(name, width){
    	for(var i = 0; i < this._columns.length; i++){
    		var col = this._columns[i];
    		if(col.name == name){
    			col.width = width;
    			break;
    		}
    	}
    }
    
    //是否是数字
    this._isNumber = function(val){
    	var regu =/^[1-9][0-9]*$/;
		var re = new RegExp(regu);
		return re.test(val);
    }
    
    //设置分页
    this._setPage = function(data){
    	var $p = this._getPageRel();
    	if($p.length == 0) return;
    	//每页记录数
    	var pageRows = this._getCurrentPageRow();
    	//总页数
    	$p.find(".ncPageTotal:first").html(data.total);
    	this.pageTotal = Number(data.total);
    	//总记录数
    	$p.find(".ncPageRecords:first").html(data.records);
    	//当前页
    	$p.find(".ncPageNum:first").val(data.page);
    	this._currentPage = Number(data.page);
    	//当前起始终止记录数
    	var startRows = (Number(data.page)-1)*Number(pageRows);
    	if(startRows > -1){
    		$p.find(".ncPageRowRange:first").html((startRows+1)+"-"+(startRows+data.gridResult.length));
    	}else{
    		$p.find(".ncPageRowRange:first").html("");
    	}
    }
    
    //每页记录数
    this._getCurrentPageRow = function(){
    	return this._getPageRel(".ncPageRows:first").val();
    }
    
    //当前页
    this._getCurrentPage = function(){
    	var pageNum = this._getPageRel(".ncPageNum:first").val();
    	var pageTotal = Number(this._getPageRel(".ncPageTotal:first").text());
    	pageNum = pageNum?pageNum:1;
    	if(this._isNumber(pageNum)){
    		pageNum = Number(pageNum);
    	    this._currentPage = (pageNum>pageTotal&&pageTotal>0)?pageTotal:pageNum;	
    	}
    	return this._currentPage==0?1:this._currentPage;
    }
    
    //当前页增加1
    this._currentPagePlus = function(num){
    	var page = num?num:this._currentPage;
      	this._currentPage = (page+1)>this.pageTotal?this.pageTotal:(page+1);
    	this._getPageRel(".ncPageNum:first").val(this._currentPage);
    }
    
    //当前页增加1
    this._currentPageMinus = function(num){
    	var page = num?num:this._currentPage;
    	this._currentPage = (page-1)<=0?1:(page-1);
    	this._getPageRel(".ncPageNum:first").val(this._currentPage);
    }
    
    //返回当前行序号
    this.getCurrentRowId = function(){
    	return this._currentRow;
    }
    
    //返回当前行数据
    this.getCurrentRowData = function(rowid){
    	if(rowid){
    		return this._cache_data[rowid - 1];
    	}else if(this._currentRow > 0 && this._cache_data && this._cache_data.length > 0){
    		return this._cache_data[this._currentRow - 1];
    	}
    	return null;
    }
    
    //根据列名和单元格的值查询行序号
    this.findRowIdByColValue = function(colName, cellValue){
    	if(!this._cache_data) return -1;
    	for(var i=0;i<this._cache_data.length;i++){
    		var item = this._cache_data[i];
    		var cv = item[colName];
    		if(cv == cellValue) return i+1;
    	}
    	return -1;
    }
    
    //设置指定行为当前行
    this.setCurrentRow = function(rowid){
    	if(!this._isNumber(rowid)) return;
    	this._currentRow = rowid;
    	
    	var $row = this._getRowRel(".ncTableRow[nc-index='"+rowid+"']");
    	$row.addClass("focus");
    	
    	if(this._headAttrs.selectType == "single"){
    		if(this._$lastCheckedBox){
    			this._$lastCheckedBox.prop("checked", false);
    		}
    	}
    	
    	var $checkBox = $row.find(".ncTableBodyItem[nc-type='attrCheckBox']:first>input[type='checkbox']");
    	if($checkBox.prop("checked")){
    		$checkBox.prop("checked", false);
    	}else{
    		$checkBox.prop("checked", true);
    		this._$lastCheckedBox = $checkBox;
    	}
    }
    
    //全选
    this.selectAllRow = function(){
        this._getRowRel(".ncTableRow[nc-index]").removeClass("focus");
        this._getRowRel(".ncTableRow[nc-index]").addClass("focus");
        this._getRowRel(".ncTableRow>.ncTableBodyItem[nc-type='attrCheckBox']>input[type='checkbox']").prop("checked",true);
    }
    
    //使已选择的行变成不选择
    this.unSelectedRow = function(){
        this._currentRow = null;
        this._getRowRel(".ncTableRow[nc-index]").removeClass("focus");
        this._getRowRel(".ncTableRow>.ncTableBodyItem[nc-type='attrCheckBox']>input[type='checkbox']").prop("checked",false);
    }
    
    //获取所有选择的行
    this.getSelectedRowData = function(){
    	var rowData = [];
    	var $inputs = this._getRowRel(".ncTableRow>.ncTableBodyItem[nc-type='attrCheckBox']>input[type='checkbox']:checked");
    	
    	$inputs.each(function(){
    		var $input = $(this);
    		var $row = $input.parent().parent();
    		var index = $row.attr("nc-index");
    		rowData.push(myself._cache_data[index-1]);
    	})
    	
    	return rowData;
    }
    
    this._getRowRel = function(selector){
    	return this.$table.find(".ncTableBody:first>"+selector+",.ncTableRowHead:first>"+selector);
    }
    
    this._getPageRel = function(selector){
    	//.ncTablePager在ncTableBody后面，此处这么写，是因为body中可能含有子表，子表也有pager
    	if(selector){
    		return this.$table.find(".ncTableBody:first").next().find(selector);
    	}else{
    		return this.$table.find(".ncTableBody:first").next();
    	}
    }
    
    //克隆表格
    this.clone = function(){
    	var $t = this.$table.clone();
    	
    	var selector = this.$table.selector+"_"+(new Date()).getTime();
    	$t.selector = selector;
    	$t.removeAttr("id");
    	$t.css({display:"block"});
    	
    	$t.ncTable(this.option);
    	
    	return $t;
    }
    
    //设置样式
    this.setStyle = function(selector, style){
    	this.$table.find(selector).css(style);
    }
    
}