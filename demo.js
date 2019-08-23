/**
 * Example
 */
var ncDemo = {
	init : function(){

		myself = this;

		$(function(){
			myself.demoTable.init();
			myself.demoTable.addData();
			
			myself.resize();
		});
	},
	resize : function(option){
		$("#demoTable").getNcTable().setHeight($(window).height() - 20);
	},
	demoTable : {
        init : function(){
        	var $table = $("#demoTable");
        	
        	$table.ncTable({
    			pageList:[50,100,200],
    			custom : {
    				"link": {
			        	formatter:function(val, rowid){
			        		return "<button class='searchNcButton' title='Try clicking' onclick='ncDemo.link("+rowid+")'><i class='fa fa-external-link'></i></button>";
				        }
			        }
    			}
    		});
        	
        	var myself = this;
        	var $searchButton = $table.find(".ncTableHeadItem[name='CreateTime']>.searchNcButton");
			$searchButton.click(function(){
			    alert("Search button click")
			});
		},
	    addData : function(){
			var grid = $("#demoTable").getNcTable();
			grid.beginUpdate();

			for(var i=0;i<20;i++){
			    grid.addRow({"CreateTime":"2019-01-02","Type":"1","Typename":"Male","PeopleName":"Mike","Birthdate":"1980-12-13","Age":"40","Weight":"80kg","Height":"182cm","Occupation":"Soft engineer","Cellphone":"102102234","FamilyAddress":"xxx Stree New York"});
			}

			grid.endUpdate();
		},
		query : function(param){
			param = param?$.extend({}, param):{};
			$("#demoTable").getNcTable().loadData("../ncdz/ncAction!querySomething.action",{
				requestParam:param
			},{
				mergeSearchParam:function(loadParam, searchParam){
					loadParam.requestParam = $.extend(loadParam.requestParam, searchParam);
					return loadParam;
			    }
			});
		}
	},
	link : function(rowid){
		alert("button click");
	}
}

ncDemo.init();
